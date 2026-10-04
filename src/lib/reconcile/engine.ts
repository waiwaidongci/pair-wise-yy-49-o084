/**
 * 课程对账引擎：外部目录推送、先修失效重算、乐观并发确认、批次断点续跑、未编号兼容。
 * 纯函数实现，不依赖 Svelte 运行时；服务端与客户端共用同一套语义。
 */

export type Relation = '支撑' | '前置' | '考核' | '教学'

/** 外部目录在某次推送中的课程快照 */
export type ExternalSnapshot = {
  courseNo: string
  name: string
  semester: string
  revisionNo: string
  prerequisites: string[]
  receivedAt: string
}

/** 推送台账条目；同一 (课程编号, 学期, 修订号) 只保留第一次结果 */
export type PushRecord = {
  key: string
  courseNo: string
  semester: string
  revisionNo: string
  snapshot: ExternalSnapshot
  receivedAt: string
  duplicate: boolean
}

export type OverrideField = 'weight' | 'relation'

/** 人工调整值：必须携带其赖以作出的基准修订，来源变化时不得悄悄生效 */
export type ManualOverride = {
  mappingKey: string
  field: OverrideField
  value: number | string
  reason: string
  baselineRevision: string
}

export type HeldOverride = ManualOverride & { heldAt: string; holdReason: string }

/** 确认冲突后的落败内容，留作待核 */
export type PendingConflict = {
  id: string
  localCourseId: string
  courseNo: string
  submitter: string
  baselineRevision: string
  submittedAt: string
  note: string
  overrides: ManualOverride[]
  status: '待核' | '已采纳' | '已驳回'
  resolutionNote?: string
  resolvedAt?: string
}

/** 依据外部先修关系派生出的前置映射 */
export type DerivedMapping = {
  key: string
  sourceCourseNo: string
  targetCourseNo: string
  relation: Relation
  weight: number
  revisionNo: string
}

/** 覆盖结论：先修覆盖（课程级）与毕业要求覆盖（要求级） */
export type CoverageConclusion = {
  key: string
  kind: '先修覆盖' | '毕业要求覆盖'
  subject: string
  subjectName: string
  status: '覆盖' | '缺口'
  detail: string
  revisionNo: string | null
}

export type ReconcileStatus = 'unlinked' | 'pending' | 'confirmed' | 'stale' | 'conflict'

export type CourseReconcile = {
  localCourseId: string
  courseName: string
  externalCourseNo: string | null
  semester: string | null
  /** 当前派生数据所反映的外部修订 */
  baselineRevision: string | null
  /** 负责人最近一次确认的修订 */
  confirmedRevision: string | null
  /** 乐观锁版本：每次写入或来源变化时自增，确认时以此判定基准是否一致 */
  version: number
  status: ReconcileStatus
  derived: DerivedMapping[]
  coverage: CoverageConclusion[]
  /** 仍在生效的人工调整 */
  overrides: ManualOverride[]
  /** 因来源先修变化被暂停生效的人工调整 */
  heldOverrides: HeldOverride[]
  pendingConflict: PendingConflict | null
  batchCompleted: boolean
  confirmedAt: string | null
  updatedAt: string
}

export type BatchStatus = 'idle' | 'running' | 'failed' | 'completed'

export type BatchState = {
  id: string
  semester: string
  status: BatchStatus
  total: number
  /** 检查点：已完成课程，恢复时从最后完成课程继续 */
  completed: string[]
  current: string | null
  failedCourse: string | null
  /** 一次性写入失败注入点，恢复时清空 */
  failureCourse: string | null
  error: string | null
  startedAt: string | null
  finishedAt: string | null
}

export type ReconcileState = {
  pushes: PushRecord[]
  courses: CourseReconcile[]
  batch: BatchState
  seq: number
}

/** 本地图谱视图：覆盖结论与人工调整都挂靠在本地课程/毕业要求上 */
export type GraphView = {
  courses: Array<{ id: string; name: string; externalCourseNo: string | null }>
  requirements: Array<{ id: string; name: string }>
  supports: Array<{ source: string; target: string; weight: number }>
}

/* ---------- 基础工具 ---------- */

export function pushKey(courseNo: string, semester: string, revisionNo: string): string {
  return `${courseNo}|${semester}|${revisionNo}`
}

export function revisionRank(revisionNo: string | null | undefined): number {
  if (!revisionNo) return 0
  const match = /(\d+)\s*$/.exec(revisionNo)
  return match ? parseInt(match[1], 10) : 0
}

export function isNewerRevision(candidate: string, current: string | null): boolean {
  return revisionRank(candidate) > revisionRank(current)
}

export function idleBatch(now: string): BatchState {
  return {
    id: 'B-0',
    semester: '',
    status: 'idle',
    total: 0,
    completed: [],
    current: null,
    failedCourse: null,
    failureCourse: null,
    error: null,
    startedAt: null,
    finishedAt: null,
  }
}

/** 取某课程在某学期的最新推送（重复推送不参与） */
export function latestPush(
  pushes: PushRecord[],
  courseNo: string,
  semester: string,
): PushRecord | null {
  const all = pushes.filter((p) => !p.duplicate && p.courseNo === courseNo && p.semester === semester)
  if (all.length === 0) return null
  return all.reduce((a, b) => (revisionRank(b.revisionNo) >= revisionRank(a.revisionNo) ? b : a))
}

function previousPush(pushes: PushRecord[], courseNo: string, semester: string, current: PushRecord): PushRecord | null {
  const all = pushes
    .filter((p) => !p.duplicate && p.courseNo === courseNo && p.semester === semester)
    .filter((p) => revisionRank(p.revisionNo) < revisionRank(current.revisionNo))
    .sort((a, b) => revisionRank(b.revisionNo) - revisionRank(a.revisionNo))
  return all[0] ?? null
}

function deriveMappings(snapshot: ExternalSnapshot): DerivedMapping[] {
  return snapshot.prerequisites.map((pre) => ({
    key: `${pre}->${snapshot.courseNo}:前置`,
    sourceCourseNo: pre,
    targetCourseNo: snapshot.courseNo,
    relation: '前置' as const,
    weight: 1,
    revisionNo: snapshot.revisionNo,
  }))
}

function overrideTouches(override: ManualOverride, ...tokens: string[]): boolean {
  return tokens.some((token) => token && override.mappingKey.includes(token))
}

/** 依据确认修订与最新派生修订解算对账状态 */
function resolveStatus(rec: CourseReconcile, latestRevision: string | null): ReconcileStatus {
  if (!rec.externalCourseNo) return 'unlinked'
  if (rec.pendingConflict?.status === '待核') return 'conflict'
  if (!rec.confirmedRevision) return 'pending'
  if (rec.confirmedRevision === latestRevision) return 'confirmed'
  return 'stale'
}

function buildCoverage(
  rec: CourseReconcile,
  latest: PushRecord | null,
  graph: GraphView,
): CoverageConclusion[] {
  const out: CoverageConclusion[] = []
  if (latest) {
    const localByNo = new Map(
      graph.courses.filter((c) => c.externalCourseNo).map((c) => [c.externalCourseNo as string, c]),
    )
    const missing = latest.snapshot.prerequisites.filter((pre) => !localByNo.has(pre))
    out.push({
      key: `pre-${rec.externalCourseNo}`,
      kind: '先修覆盖',
      subject: rec.externalCourseNo as string,
      subjectName: rec.courseName,
      status: missing.length ? '缺口' : '覆盖',
      detail: missing.length
        ? `先修课程 ${missing.join('、')} 尚未在本地图谱建档，需先补齐编号`
        : '先修关系均可在本地图谱中找到对应课程',
      revisionNo: latest.snapshot.revisionNo,
    })
  }
  for (const req of graph.requirements) {
    const hits = graph.supports.filter((s) => s.source === req.id)
    out.push({
      key: `gr-${req.id}`,
      kind: '毕业要求覆盖',
      subject: req.id,
      subjectName: req.name,
      status: hits.length ? '覆盖' : '缺口',
      detail: hits.length ? `由 ${hits.map((h) => h.target).join('、')} 支撑` : '未关联任何课程支撑证据',
      revisionNo: latest?.snapshot.revisionNo ?? null,
    })
  }
  return out
}

/** 依据当前台账重算某课程的派生映射与覆盖结论；先修变化时暂停生效中的人工调整 */
export function recomputeCourse(
  state: ReconcileState,
  input: CourseReconcile,
  graph: GraphView,
  now: string,
): CourseReconcile {
  if (!input.externalCourseNo) {
    return { ...input, status: 'unlinked', derived: [], coverage: [], updatedAt: now }
  }
  const latest = latestPush(state.pushes, input.externalCourseNo, input.semester as string)
  const derived = latest ? deriveMappings(latest.snapshot) : []
  const coverage = buildCoverage(input, latest, graph)
  let heldOverrides = input.heldOverrides
  if (latest) {
    const prev = previousPush(state.pushes, input.externalCourseNo, input.semester as string, latest)
    const changed = prev !== null && JSON.stringify(prev.snapshot.prerequisites) !== JSON.stringify(latest.snapshot.prerequisites)
    if (changed) {
      const affected = input.overrides.filter((o) =>
        overrideTouches(o, input.externalCourseNo as string, input.localCourseId),
      )
      if (affected.length) {
        const heldKeys = new Set(heldOverrides.map((h) => h.mappingKey))
        const holdReason = `来源修订 ${latest.snapshot.revisionNo} 先修关系变化，人工调整暂停生效待复核`
        const newHeld = affected
          .filter((o) => !heldKeys.has(o.mappingKey))
          .map((o) => ({ ...o, heldAt: now, holdReason }))
        heldOverrides = [...heldOverrides, ...newHeld]
      }
    }
  }
  const baselineRevision = latest?.snapshot.revisionNo ?? null
  const next: CourseReconcile = {
    ...input,
    baselineRevision,
    derived,
    coverage,
    heldOverrides,
    updatedAt: now,
  }
  return { ...next, status: resolveStatus(next, baselineRevision) }
}

/* ---------- 推送：幂等沿用第一次结果，新修订立即失效重算 ---------- */

export type PushOutcome =
  | { result: 'applied'; state: ReconcileState; affected: string[] }
  | { result: 'duplicate'; state: ReconcileState; duplicateOf: PushRecord }

export function ingestPush(
  state: ReconcileState,
  snapshot: ExternalSnapshot,
  graph: GraphView,
  now: string,
): PushOutcome {
  const key = pushKey(snapshot.courseNo, snapshot.semester, snapshot.revisionNo)
  const existing = state.pushes.find((p) => p.key === key)
  if (existing) {
    return { result: 'duplicate', state, duplicateOf: existing }
  }
  const record: PushRecord = {
    key,
    courseNo: snapshot.courseNo,
    semester: snapshot.semester,
    revisionNo: snapshot.revisionNo,
    snapshot,
    receivedAt: now,
    duplicate: false,
  }
  const nextPushes = [...state.pushes, record]
  const nextState: ReconcileState = { ...state, pushes: nextPushes }
  const affected: string[] = []
  const courses = nextState.courses.map((rec) => {
    if (rec.externalCourseNo === snapshot.courseNo && (rec.semester as string) === snapshot.semester) {
      affected.push(rec.localCourseId)
      // 来源修订变化：版本自增，基于旧版本的确认将被判定基准不一致
      return { ...recomputeCourse(nextState, rec, graph, now), version: rec.version + 1 }
    }
    return rec
  })
  return { result: 'applied', state: { ...nextState, courses }, affected }
}

/* ---------- 确认：乐观并发，基准修订一致才写入，落败留待核 ---------- */

export type ConfirmArgs = {
  localCourseId: string
  submitter: string
  baselineRevision: string
  /** 提交方载入页面时的课程版本，用于乐观并发判定基准是否一致 */
  baselineVersion: number
  note: string
  overrides?: ManualOverride[]
}

export type ConfirmOutcome =
  | { result: 'confirmed'; state: ReconcileState }
  | { result: 'conflict'; state: ReconcileState; pending: PendingConflict }
  | { result: 'error'; state: ReconcileState; message: string }

function mergeOverrides(existing: ManualOverride[], incoming: ManualOverride[]): ManualOverride[] {
  const byKey = new Map(existing.map((o) => [o.mappingKey, o]))
  for (const o of incoming) byKey.set(o.mappingKey, o)
  return [...byKey.values()]
}

export function confirmCourse(
  state: ReconcileState,
  args: ConfirmArgs,
  graph: GraphView,
  now: string,
): ConfirmOutcome {
  const rec = state.courses.find((c) => c.localCourseId === args.localCourseId)
  if (!rec) return { result: 'error', state, message: '课程不存在' }
  if (!rec.externalCourseNo) {
    return { result: 'error', state, message: '该课程缺少外部课程编号，暂不能对账' }
  }
  const latest = latestPush(state.pushes, rec.externalCourseNo, rec.semester as string)
  const currentBaseline = latest?.snapshot.revisionNo ?? null
  if (args.baselineVersion !== rec.version) {
    // 基准不一致（他人已先写入或来源已更新）：落败内容留作待核，不写入
    const pending: PendingConflict = {
      id: `PC-${state.seq + 1}`,
      localCourseId: rec.localCourseId,
      courseNo: rec.externalCourseNo,
      submitter: args.submitter,
      baselineRevision: `v${args.baselineVersion}（外部基准 ${args.baselineRevision}）`,
      submittedAt: now,
      note: args.note,
      overrides: args.overrides ?? [],
      status: '待核',
    }
    const courses = state.courses.map((c) =>
      c.localCourseId === rec.localCourseId
        ? { ...c, status: 'conflict' as const, pendingConflict: pending, updatedAt: now }
        : c,
    )
    return {
      result: 'conflict',
      state: { ...state, courses, seq: state.seq + 1 },
      pending,
    }
  }
  const overrides = mergeOverrides(rec.overrides, args.overrides ?? [])
  const confirmed: CourseReconcile = {
    ...rec,
    overrides,
    confirmedRevision: currentBaseline,
    confirmedAt: now,
    pendingConflict: null,
    version: rec.version + 1,
    updatedAt: now,
  }
  const courses = state.courses.map((c) =>
    c.localCourseId === rec.localCourseId ? recomputeCourse(state, confirmed, graph, now) : c,
  )
  return { result: 'confirmed', state: { ...state, courses } }
}

/* ---------- 补齐外部编号：先兼容保留，补齐后接回对账 ---------- */

export type LinkOutcome =
  | { result: 'linked'; state: ReconcileState }
  | { result: 'already'; state: ReconcileState }
  | { result: 'error'; state: ReconcileState; message: string }

export function linkCourse(
  state: ReconcileState,
  args: { localCourseId: string; externalCourseNo: string; semester: string },
  graph: GraphView,
  now: string,
): LinkOutcome {
  const rec = state.courses.find((c) => c.localCourseId === args.localCourseId)
  if (!rec) return { result: 'error', state, message: '课程不存在' }
  if (rec.externalCourseNo) return { result: 'already', state }
  const linked: CourseReconcile = {
    ...rec,
    externalCourseNo: args.externalCourseNo.trim(),
    semester: args.semester,
    batchCompleted: false,
    pendingConflict: null,
    version: rec.version + 1,
  }
  const courses = state.courses.map((c) =>
    c.localCourseId === rec.localCourseId ? recomputeCourse(state, linked, graph, now) : c,
  )
  return { result: 'linked', state: { ...state, courses } }
}

/* ---------- 待核冲突处理：采纳落败内容或驳回 ---------- */

export function resolveConflict(
  state: ReconcileState,
  args: { pendingId: string; decision: 'adopt' | 'reject'; note: string },
  graph: GraphView,
  now: string,
): { state: ReconcileState; result: 'adopted' | 'rejected' | 'error'; message?: string } {
  const rec = state.courses.find((c) => c.pendingConflict?.id === args.pendingId)
  if (!rec || !rec.pendingConflict) return { state, result: 'error', message: '待核记录不存在' }
  const pending: PendingConflict = {
    ...rec.pendingConflict,
    status: args.decision === 'adopt' ? '已采纳' : '已驳回',
    resolutionNote: args.note,
    resolvedAt: now,
  }
  let next: CourseReconcile = { ...rec, pendingConflict: pending, updatedAt: now }
  if (args.decision === 'adopt') {
    const latest = latestPush(state.pushes, rec.externalCourseNo as string, rec.semester as string)
    next = {
      ...next,
      overrides: mergeOverrides(rec.overrides, pending.overrides),
      confirmedRevision: latest?.snapshot.revisionNo ?? null,
      confirmedAt: now,
      version: rec.version + 1,
    }
  }
  const courses = state.courses.map((c) =>
    c.localCourseId === rec.localCourseId ? recomputeCourse(state, next, graph, now) : c,
  )
  return { state: { ...state, courses }, result: args.decision === 'adopt' ? 'adopted' : 'rejected' }
}

/* ---------- 批次对账：检查点续跑，已确认课程不重复 ---------- */

function applyBatchWrite(
  rec: CourseReconcile,
  latest: PushRecord | null,
  graph: GraphView,
  now: string,
  pushes: PushRecord[],
): CourseReconcile {
  const written: CourseReconcile = {
    ...rec,
    confirmedRevision: latest?.snapshot.revisionNo ?? null,
    confirmedAt: now,
    batchCompleted: true,
    pendingConflict: null,
    version: rec.version + 1,
  }
  return recomputeCourse(
    { pushes, courses: [], batch: idleBatch(now), seq: 0 },
    written,
    graph,
    now,
  )
}

function stepBatch(
  state: ReconcileState,
  graph: GraphView,
  now: string,
): { state: ReconcileState; result: 'completed' | 'failed'; batch: BatchState } {
  const batch: BatchState = { ...state.batch, status: 'running', error: null }
  const targets = state.courses
    .filter((c) => c.externalCourseNo && (c.semester as string) === batch.semester)
    .sort((a, b) => a.localCourseId.localeCompare(b.localCourseId))
  let courses = state.courses
  const completed = [...batch.completed]
  for (const rec of targets) {
    if (completed.includes(rec.localCourseId)) continue
    const latest = latestPush(state.pushes, rec.externalCourseNo as string, rec.semester as string)
    const upToDate = rec.confirmedRevision === latest?.snapshot.revisionNo && rec.status !== 'stale'
    if (upToDate) {
      completed.push(rec.localCourseId)
      continue
    }
    batch.current = rec.localCourseId
    if (batch.failureCourse && rec.localCourseId === batch.failureCourse) {
      const failed: BatchState = {
        ...batch,
        status: 'failed',
        failedCourse: rec.localCourseId,
        current: null,
        completed: [...completed],
        error: `写入 ${rec.localCourseId} 时事务失败：已回滚该课程，检查点停在 ${completed.length ? completed[completed.length - 1] : '起点'}`,
        finishedAt: now,
      }
      return { state: { ...state, courses, batch: failed }, result: 'failed', batch: failed }
    }
    courses = courses.map((c) =>
      c.localCourseId === rec.localCourseId ? applyBatchWrite(c, latest, graph, now, state.pushes) : c,
    )
    completed.push(rec.localCourseId)
  }
  const done: BatchState = {
    ...batch,
    status: 'completed',
    completed,
    current: null,
    failureCourse: null,
    finishedAt: now,
  }
  return { state: { ...state, courses, batch: done }, result: 'completed', batch: done }
}

export function startBatch(
  state: ReconcileState,
  args: { semester: string; failureCourse?: string | null },
  graph: GraphView,
  now: string,
): { state: ReconcileState; result: 'completed' | 'failed'; batch: BatchState } {
  const targets = state.courses.filter(
    (c) => c.externalCourseNo && (c.semester as string) === args.semester,
  )
  const batch: BatchState = {
    id: `B-${state.seq + 1}`,
    semester: args.semester,
    status: 'running',
    total: targets.length,
    completed: [],
    current: null,
    failedCourse: null,
    failureCourse: args.failureCourse ?? null,
    error: null,
    startedAt: now,
    finishedAt: null,
  }
  return stepBatch({ ...state, batch, seq: state.seq + 1 }, graph, now)
}

export function resumeBatch(
  state: ReconcileState,
  graph: GraphView,
  now: string,
): { state: ReconcileState; result: 'completed' | 'failed' | 'not-failed'; batch: BatchState } {
  if (state.batch.status !== 'failed') {
    return { state, result: 'not-failed', batch: state.batch }
  }
  // 失败为一次性注入：恢复时清空注入点，从最后完成课程继续
  const batch: BatchState = {
    ...state.batch,
    status: 'running',
    failureCourse: null,
    failedCourse: null,
    error: null,
  }
  return stepBatch({ ...state, batch }, graph, now)
}

/* ---------- 初始状态 ---------- */

export function initialState(seed: {
  graph: GraphView
  pushes: ExternalSnapshot[]
  semester: string
  confirmed: Record<string, string>
  overrides?: Record<string, ManualOverride[]>
  now: string
}): ReconcileState {
  const pushes: PushRecord[] = seed.pushes.map((s) => ({
    key: pushKey(s.courseNo, s.semester, s.revisionNo),
    courseNo: s.courseNo,
    semester: s.semester,
    revisionNo: s.revisionNo,
    snapshot: s,
    receivedAt: s.receivedAt,
    duplicate: false,
  }))
  let state: ReconcileState = { pushes, courses: [], batch: idleBatch(seed.now), seq: 0 }
  const courses: CourseReconcile[] = seed.graph.courses.map((c) => {
    const linked = c.externalCourseNo !== null
    const rec: CourseReconcile = {
      localCourseId: c.id,
      courseName: c.name,
      externalCourseNo: c.externalCourseNo,
      semester: linked ? seed.semester : null,
      baselineRevision: null,
      confirmedRevision: linked ? seed.confirmed[c.id] ?? null : null,
      version: 1,
      status: linked ? 'pending' : 'unlinked',
      derived: [],
      coverage: [],
      overrides: seed.overrides?.[c.id] ?? [],
      heldOverrides: [],
      pendingConflict: null,
      batchCompleted: false,
      confirmedAt: linked && seed.confirmed[c.id] ? seed.now : null,
      updatedAt: seed.now,
    }
    return recomputeCourse(state, rec, seed.graph, seed.now)
  })
  state = { ...state, courses }
  return state
}
