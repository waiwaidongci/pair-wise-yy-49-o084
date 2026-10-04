import {
  catalogKey,
  samePrerequisites,
  type BatchState,
  type CatalogPush,
  type CoverageResult,
  type ExternalCourse,
  type LocalMapping,
  type PendingReview,
  type ProcessedCourse,
  type PushReceipt,
  type ReconState,
} from './types'

export type BatchWriter = (course: ExternalCourse, mappings: LocalMapping[]) => void | Promise<void>

const rid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`

/** 来源侧权重：目录本身不给权重，先修链不完整时来源置信度下降 */
export function computeSourceWeight(course: ExternalCourse, catalog: ReconState['catalog'], previous: number | null): number {
  const unresolved = course.prerequisites.filter((code) => !catalog[catalogKey(course.term, code)])
  const base = unresolved.length === 0 ? 1 : Math.max(0.5, 1 - unresolved.length * 0.1)
  return previous ?? base
}

export function createReconState(term: string): ReconState {
  return { term, catalog: {}, mappings: [], pending: [], coverage: [], batches: {}, pushReceipts: {} }
}

export type ConfirmOutcome =
  | { outcome: 'committed'; mappingId: string; revision: number; resolvedPending: string[] }
  | { outcome: 'already-confirmed'; mappingId: string; owner: string | null; revision: number }
  | { outcome: 'not-reconcilable'; mappingId: string; status: LocalMapping['status']; reason: string }
  | { outcome: 'revision-moved'; mappingId: string; expectedRevision: number; currentRevision: number; pendingId: string }
  | { outcome: 'lost-race'; mappingId: string; winnerOwner: string; pendingId: string }
  | { outcome: 'not-found'; mappingId: string }

/**
 * 课程目录对账引擎。
 * 所有写操作都在内部状态上留下检查点/收据，保证推送幂等、失效可追、确认可仲裁、批次可续跑。
 */
export class Recon {
  state: ReconState

  constructor(state: ReconState) {
    this.state = state
  }

  private courseOf(mapping: LocalMapping): ExternalCourse | null {
    if (!mapping.courseCode) return null
    return this.state.catalog[catalogKey(mapping.term, mapping.courseCode)] ?? null
  }

  /**
   * 接收目录推送。同一 batchId 重复推送直接沿用第一次收据，不做任何重算；
   * 同一修订在新批次里出现按 unchanged 处理。先修变化立即失效相关映射与覆盖结论。
   */
  ingestPush(push: CatalogPush): PushReceipt {
    const first = this.state.pushReceipts[push.batchId]
    if (first) {
      return { ...first, duplicated: true }
    }

    const receipt: PushReceipt = {
      batchId: push.batchId,
      pushedAt: push.pushedAt,
      duplicated: false,
      accepted: [],
      unchanged: [],
      refreshed: [],
      prereqChanged: [],
      invalidatedMappings: [],
      invalidatedCoverage: [],
      enqueuedPending: [],
    }

    for (const incoming of push.courses) {
      if (incoming.term !== this.state.term) {
        throw new Error(`课程 ${incoming.code} 学期 ${incoming.term} 与对账学期 ${this.state.term} 不一致`)
      }
      const key = catalogKey(incoming.term, incoming.code)
      const previous = this.state.catalog[key]

      if (!previous) {
        this.state.catalog[key] = { ...incoming }
        receipt.accepted.push(incoming.code)
        continue
      }
      if (incoming.revision === previous.revision) {
        receipt.unchanged.push(incoming.code)
        continue
      }
      if (incoming.revision < previous.revision) {
        throw new Error(`课程 ${incoming.code} 推送修订 ${incoming.revision} 早于目录修订 ${previous.revision}，拒绝回退`)
      }

      const prereqChanged = !samePrerequisites(previous.prerequisites, incoming.prerequisites)
      this.state.catalog[key] = { ...incoming }

      if (!prereqChanged) {
        // 修订号前进但先修未变：映射继续有效，只把基准修订前移，不触发失效
        for (const mapping of this.state.mappings) {
          if (mapping.courseCode === incoming.code && mapping.term === incoming.term) {
            if (mapping.status === 'confirmed' || mapping.status === 'reconciled') {
              mapping.baselineRevision = incoming.revision
              mapping.lastReconciledRevision = incoming.revision
            }
          }
        }
        receipt.refreshed.push(incoming.code)
        continue
      }

      receipt.prereqChanged.push(incoming.code)
      for (const mapping of this.state.mappings) {
        if (mapping.courseCode !== incoming.code || mapping.term !== incoming.term) continue
        if (mapping.status === 'pending-code') continue

        const newSourceWeight = computeSourceWeight(incoming, this.state.catalog, null)
        mapping.status = 'stale'
        mapping.conflict = `外部先修于修订 ${incoming.revision} 变化：[${previous.prerequisites.join(', ')}] → [${incoming.prerequisites.join(', ')}]`
        // confirmedWeight 原样保留，来源变化绝不静默改写人工/确认值
        if (mapping.manual && mapping.manual.weight !== newSourceWeight) {
          const pending = this.enqueuePending({
            kind: 'manual-drift',
            mapping,
            owner: mapping.manual.owner,
            detail: `人工调整值 ${mapping.manual.weight} 与来源重算值 ${newSourceWeight} 漂移（${mapping.conflict}），人工值保留待核`,
            proposedWeight: mapping.manual.weight,
            expectedRevision: mapping.baselineRevision,
            at: push.pushedAt,
          })
          receipt.enqueuedPending.push(pending.id)
        }
        receipt.invalidatedMappings.push(mapping.id)
      }

      // 覆盖结论按贡献来源失效（只动引用了该课程的要求）
      for (const coverage of this.state.coverage) {
        if (coverage.contributions.some((item) => item.courseCode === incoming.code)) {
          coverage.status = 'invalidated'
          coverage.invalidatedReason = `课程 ${incoming.code} 先修于修订 ${incoming.revision} 变化，结论失效待重算`
          coverage.recomputedAt = null
          receipt.invalidatedCoverage.push(coverage.requirementId)
        }
      }
    }

    this.state.pushReceipts[push.batchId] = receipt
    return receipt
  }

  private enqueuePending(input: {
    kind: PendingReview['kind']
    mapping: LocalMapping
    owner: string
    detail: string
    proposedWeight: number
    expectedRevision: number | null
    at: string
  }): PendingReview {
    // 同一映射同类型的未决条目不重复入队
    const existing = this.state.pending.find(
      (item) => !item.resolved && item.kind === input.kind && item.mappingId === input.mapping.id,
    )
    if (existing) return existing
    const pending: PendingReview = {
      id: rid('PEND'),
      kind: input.kind,
      mappingId: input.mapping.id,
      courseCode: input.mapping.courseCode,
      owner: input.owner,
      at: input.at,
      detail: input.detail,
      proposedWeight: input.proposedWeight,
      expectedRevision: input.expectedRevision,
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
    }
    this.state.pending.unshift(pending)
    return pending
  }

  /** 重算毕业要求覆盖结论。失效结论必须显式重算才会刷新。 */
  recomputeCoverage(at: string, requirementIds?: string[]): CoverageResult[] {
    const ids = new Set<string>()
    for (const mapping of this.state.mappings) ids.add(mapping.requirementId)
    for (const coverage of this.state.coverage) ids.add(coverage.requirementId)
    if (requirementIds) requirementIds.forEach((id) => ids.add(id))

    const results: CoverageResult[] = []
    for (const requirementId of ids) {
      const related = this.state.mappings.filter((mapping) => mapping.requirementId === requirementId && mapping.term === this.state.term)
      const confirmed = related.filter((mapping) => mapping.status === 'confirmed' && mapping.courseCode)
      const excludedLegacy = related
        .filter((mapping) => mapping.status === 'pending-code')
        .map((mapping) => ({ mappingId: mapping.id, localCourseId: mapping.localCourseId }))

      const contributions = []
      const basedOnRevisions: Record<string, number> = {}
      const unresolved = new Set<string>()
      for (const mapping of confirmed) {
        const course = this.courseOf(mapping)
        if (!course) continue
        contributions.push({
          mappingId: mapping.id,
          courseCode: course.code,
          weight: mapping.confirmedWeight ?? mapping.sourceWeight,
          revision: course.revision,
        })
        basedOnRevisions[course.code] = course.revision
        for (const prereq of course.prerequisites) {
          if (!this.state.catalog[catalogKey(course.term, prereq)]) unresolved.add(prereq)
        }
      }

      const result: CoverageResult = {
        requirementId,
        term: this.state.term,
        status: contributions.length > 0 ? 'covered' : 'gap',
        contributions,
        excludedLegacy,
        unresolvedPrereqs: [...unresolved],
        basedOnRevisions,
        recomputedAt: at,
        invalidatedReason: null,
      }
      results.push(result)

      const index = this.state.coverage.findIndex((item) => item.requirementId === requirementId && item.term === this.state.term)
      if (index >= 0) this.state.coverage[index] = result
      else this.state.coverage.push(result)
    }
    return results
  }

  /**
   * 课程负责人确认映射（乐观锁 CAS）。
   * expectedRevision 必须与目录当前修订一致；同基准并发提交只放行先到者，落败内容入待核队列。
   */
  confirmMapping(input: { mappingId: string; owner: string; weight?: number; expectedRevision: number; at: string }): ConfirmOutcome {
    const mapping = this.state.mappings.find((item) => item.id === input.mappingId)
    if (!mapping) return { outcome: 'not-found', mappingId: input.mappingId }

    const course = this.courseOf(mapping)
    if (!mapping.courseCode || !course) {
      return { outcome: 'not-reconcilable', mappingId: mapping.id, status: mapping.status, reason: '缺少外部课程编号，需先补齐再接回对账' }
    }
    if (mapping.status === 'confirmed') {
      return { outcome: 'already-confirmed', mappingId: mapping.id, owner: mapping.manual?.owner ?? null, revision: mapping.baselineRevision ?? course.revision }
    }
    if (mapping.status !== 'reconciled') {
      return { outcome: 'not-reconcilable', mappingId: mapping.id, status: mapping.status, reason: mapping.conflict ?? '映射尚未重算到当前目录' }
    }
    if (input.expectedRevision !== course.revision) {
      // 基准落后：提交不写入，留作待核（提交人依据的是旧先修）
      const pending = this.enqueuePending({
        kind: 'confirm-loser',
        mapping,
        owner: input.owner,
        detail: `基准修订 ${input.expectedRevision} 与目录修订 ${course.revision} 不一致，确认未写入，内容待核`,
        proposedWeight: input.weight ?? mapping.sourceWeight,
        expectedRevision: input.expectedRevision,
        at: input.at,
      })
      return { outcome: 'revision-moved', mappingId: mapping.id, expectedRevision: input.expectedRevision, currentRevision: course.revision, pendingId: pending.id }
    }

    // 基准一致也只有一方能写入：reconciled → confirmed 的 CAS
    const winnerWeight = input.weight ?? mapping.sourceWeight
    mapping.status = 'confirmed'
    mapping.baselineRevision = course.revision
    mapping.confirmedWeight = winnerWeight
    mapping.conflict = null
    if (!mapping.manual || mapping.manual.owner !== input.owner) {
      mapping.manual = { weight: winnerWeight, owner: input.owner, note: '确认写入', at: input.at }
    }

    // 确认即负责人裁决：该映射挂起的漂移/落败条目结案
    const resolvedPending: string[] = []
    for (const item of this.state.pending) {
      if (!item.resolved && item.mappingId === mapping.id) {
        item.resolved = true
        item.resolvedBy = input.owner
        item.resolvedAt = input.at
        resolvedPending.push(item.id)
      }
    }

    this.recomputeCoverage(input.at, [mapping.requirementId])
    return { outcome: 'committed', mappingId: mapping.id, revision: course.revision, resolvedPending }
  }

  /**
   * 第二个负责人同基准并发提交时，由会话层在第一次提交成功后调用：
   * 落败内容不覆盖已写入值，转入待核队列。
   */
  registerConflictingSubmission(input: { mappingId: string; owner: string; weight: number; expectedRevision: number; at: string; winnerOwner: string }): PendingReview | null {
    const mapping = this.state.mappings.find((item) => item.id === input.mappingId)
    if (!mapping) return null
    return this.enqueuePending({
      kind: 'confirm-loser',
      mapping,
      owner: input.owner,
      detail: `与 ${input.winnerOwner} 并发确认同一映射，基准修订同为 ${input.expectedRevision}，仅先到方写入，落败内容待核`,
      proposedWeight: input.weight,
      expectedRevision: input.expectedRevision,
      at: input.at,
    })
  }

  /**
   * 人工调整。来源已经变化（stale）时只登记人工值并挂待核，绝不静默覆盖来源重算结果。
   */
  applyManualAdjustment(input: { mappingId: string; weight: number; owner: string; note: string; at: string }) {
    const mapping = this.state.mappings.find((item) => item.id === input.mappingId)
    if (!mapping) throw new Error(`映射 ${input.mappingId} 不存在`)
    const course = this.courseOf(mapping)
    const currentRevision = course?.revision ?? null

    mapping.manual = { weight: input.weight, owner: input.owner, note: input.note, at: input.at }

    if (mapping.status === 'confirmed' && mapping.baselineRevision === currentRevision) {
      // 当前修订已确认：人工调整即显式写入
      mapping.confirmedWeight = input.weight
      this.recomputeCoverage(input.at, [mapping.requirementId])
      return { applied: true, enqueued: null as string | null }
    }

    // 其余情况（失效中 / 已重算待重新确认 / 缺编号）：
    // 旧确认值保留不动，人工值登记后挂待核，绝不悄悄覆盖来源变化
    const enqueue =
      input.weight !== mapping.sourceWeight ||
      // 已确认权重来自旧修订时，即使数值碰巧相同也要走一次裁决
      (mapping.confirmedWeight !== null && mapping.baselineRevision !== currentRevision)
    if (enqueue) {
      const pending = this.enqueuePending({
        kind: 'manual-drift',
        mapping,
        owner: input.owner,
        detail:
          mapping.status === 'stale'
            ? `来源已变更（基准修订 ${mapping.baselineRevision} → 当前 ${currentRevision}），人工调整值 ${input.weight} 未覆盖来源值 ${mapping.sourceWeight}，待负责人裁决`
            : `映射尚未在修订 ${currentRevision ?? '—'} 重新确认，人工调整值 ${input.weight} 挂待核，不覆盖既有确认值 ${mapping.confirmedWeight ?? '—'}`,
        proposedWeight: input.weight,
        expectedRevision: mapping.baselineRevision,
        at: input.at,
      })
      return { applied: false, enqueued: pending.id }
    }
    return { applied: false, enqueued: null }
  }

  /**
   * 批次写入。失败抛错时已完成课程都在检查点里；再次以同一 batchId 调用即为恢复，
   * 从最后完成课程之后继续，已确认课程按当前修订跳过。
   */
  async runBatch(input: {
    batchId: string
    at: string
    write?: BatchWriter
    /** 首次运行时的课程顺序；恢复时以已存计划为准 */
    plannedCourses?: string[]
  }): Promise<BatchState> {
    const existing = this.state.batches[input.batchId]
    const batch: BatchState =
      existing ?? {
        batchId: input.batchId,
        term: this.state.term,
        status: 'running',
        plannedCourses: input.plannedCourses ?? Object.values(this.state.catalog)
          .filter((course) => course.term === this.state.term)
          .map((course) => course.code)
          .sort(),
        processed: [],
        lastCompletedCourse: null,
        failedCourse: null,
        error: null,
        startedAt: input.at,
        finishedAt: null,
      }
    batch.status = 'running'
    batch.error = null
    batch.failedCourse = null
    this.state.batches[input.batchId] = batch

    const done = new Map(batch.processed.map((item) => [item.code, item]))
    for (const code of batch.plannedCourses) {
      const course = this.state.catalog[catalogKey(this.state.term, code)]
      if (!course) continue

      const checkpoint = done.get(code)
      if (checkpoint && checkpoint.revision === course.revision) {
        // 恢复时跳过已完成课程；已确认课程不重复写入
        batch.lastCompletedCourse = code
        continue
      }

      const targets = this.state.mappings.filter(
        (mapping) => mapping.courseCode === code && mapping.term === this.state.term && mapping.status !== 'pending-code',
      )
      const confirmed = targets.filter((mapping) => mapping.status === 'confirmed' && mapping.baselineRevision === course.revision)
      const pendingWrites = targets.filter((mapping) => mapping.status !== 'confirmed' || mapping.baselineRevision !== course.revision)

      try {
        if (pendingWrites.length > 0 && input.write) {
          await input.write(course, pendingWrites)
        }
      } catch (error) {
        batch.status = 'failed'
        batch.failedCourse = code
        batch.error = error instanceof Error ? error.message : String(error)
        throw error
      }

      // 写入成功后提交映射重算结果
      for (const mapping of pendingWrites) {
        mapping.sourceWeight = computeSourceWeight(course, this.state.catalog, mapping.sourceWeight)
        mapping.status = 'reconciled'
        mapping.lastReconciledRevision = course.revision
        mapping.baselineRevision = course.revision
        mapping.conflict = null
      }

      const record: ProcessedCourse = {
        code,
        revision: course.revision,
        mappingIds: targets.map((mapping) => mapping.id),
        skippedConfirmed: pendingWrites.length === 0 && confirmed.length > 0,
        at: input.at,
      }
      const previousIndex = batch.processed.findIndex((item) => item.code === code)
      if (previousIndex >= 0) batch.processed[previousIndex] = record
      else batch.processed.push(record)
      batch.lastCompletedCourse = code
    }

    batch.status = 'completed'
    batch.finishedAt = input.at
    return batch
  }

  resumeBatch(batchId: string, at: string, write?: BatchWriter) {
    return this.runBatch({ batchId, at, write })
  }

  /**
   * 历史数据补外部编号：编号在目录中存在才接回对账，映射转为 stale 进入下一轮批次；
   * 缺编号期间一直兼容保留，不删除不报错。
   */
  backfillExternalCode(input: { mappingId: string; code: string; at: string }) {
    const mapping = this.state.mappings.find((item) => item.id === input.mappingId)
    if (!mapping) return { outcome: 'not-found' as const, mappingId: input.mappingId }
    if (mapping.courseCode) return { outcome: 'already-linked' as const, mappingId: mapping.id, code: mapping.courseCode }

    const course = this.state.catalog[catalogKey(this.state.term, input.code)]
    if (!course) {
      return { outcome: 'catalog-missing' as const, mappingId: mapping.id, code: input.code }
    }

    mapping.courseCode = input.code
    mapping.status = 'stale'
    mapping.baselineRevision = null
    mapping.lastReconciledRevision = null
    mapping.conflict = `补齐外部编号 ${input.code}（修订 ${course.revision}），等待批次重算`
    for (const item of this.state.pending) {
      if (item.mappingId === mapping.id) item.courseCode = input.code
    }
    return { outcome: 'linked' as const, mappingId: mapping.id, code: input.code, revision: course.revision }
  }
}
