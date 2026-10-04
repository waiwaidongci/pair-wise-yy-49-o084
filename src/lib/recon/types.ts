// 课程目录对账领域模型
// 三个世界：外部课程目录（带编号/学期/修订号）、本地映射（含人工调整）、毕业要求覆盖结论

export type Term = string

/** 教务系统推送的外部课程条目 */
export type ExternalCourse = {
  /** 外部课程编号 */
  code: string
  term: Term
  /** 修订号，单调递增；同一 (学期,编号) 的修订号唯一标识一次目录版本 */
  revision: number
  title: string
  /** 先修课程编号列表；先修改动是映射/覆盖结论失效的唯一触发条件 */
  prerequisites: string[]
  updatedAt: string
}

/** 一次目录推送批次 */
export type CatalogPush = {
  batchId: string
  pushedAt: string
  courses: ExternalCourse[]
}

/**
 * 本地映射状态机：
 * pending-code 缺外部编号，兼容保留，不参与对账与覆盖计算
 * stale        外部先修变化，映射立即失效，等待重算
 * reconciled   已按新来源重算，等待课程负责人确认
 * confirmed    负责人已确认，仅在基准修订一致时有效
 */
export type MappingStatus = 'pending-code' | 'stale' | 'reconciled' | 'confirmed'

export type ManualAdjustment = {
  /** 人工调整后的权重，来源变化时保留原值，绝不被静默覆盖 */
  weight: number
  owner: string
  note: string
  at: string
}

export type LocalMapping = {
  id: string
  requirementId: string
  /** 外部课程编号；null 表示历史数据缺编号，先兼容保留 */
  courseCode: string | null
  /** 本地课程图谱节点编号，缺外部编号时据此保留映射 */
  localCourseId: string
  term: Term
  /** 确认时所依据的外部修订号；并发确认的 CAS 基准 */
  baselineRevision: number | null
  status: MappingStatus
  /** 来源侧权重（目录对账结果） */
  sourceWeight: number
  /** 负责人确认写入的权重 */
  confirmedWeight: number | null
  /** 人工调整值；与新来源冲突时挂起到待核队列 */
  manual: ManualAdjustment | null
  /** 批次最后一次把该映射重算到的外部修订号 */
  lastReconciledRevision: number | null
  conflict: string | null
}

export type PendingKind = 'manual-drift' | 'confirm-loser'

/** 待核队列：人工值与来源漂移、并发确认落败内容都留在这里 */
export type PendingReview = {
  id: string
  kind: PendingKind
  mappingId: string
  courseCode: string | null
  owner: string
  at: string
  detail: string
  /** 落败/挂起方提交的内容，保留待核 */
  proposedWeight: number
  /** 提交方看到的基准修订号 */
  expectedRevision: number | null
  resolved: boolean
  resolvedBy: string | null
  resolvedAt: string | null
}

export type CoverageStatus = 'covered' | 'gap' | 'invalidated'

export type CoverageContribution = {
  mappingId: string
  courseCode: string
  weight: number
  revision: number
}

export type CoverageResult = {
  requirementId: string
  term: Term
  status: CoverageStatus
  /** 当前有效的已确认支撑 */
  contributions: CoverageContribution[]
  /** 因缺外部编号被排除的历史映射（兼容保留但不计入覆盖） */
  excludedLegacy: Array<{ mappingId: string; localCourseId: string }>
  /** 目录中解析不到的先修编号 */
  unresolvedPrereqs: string[]
  basedOnRevisions: Record<string, number>
  recomputedAt: string | null
  /** invalidated 时记录的失效原因 */
  invalidatedReason: string | null
}

export type ProcessedCourse = {
  code: string
  revision: number
  mappingIds: string[]
  /** 该课程在当前修订下已确认，写入被跳过 */
  skippedConfirmed: boolean
  at: string
}

export type BatchStatus = 'running' | 'failed' | 'completed'

export type BatchState = {
  batchId: string
  term: Term
  status: BatchStatus
  /** 推送计划的课程顺序，恢复时沿用 */
  plannedCourses: string[]
  /** 已完成课程检查点，顺序追加；失败课程不入表 */
  processed: ProcessedCourse[]
  lastCompletedCourse: string | null
  failedCourse: string | null
  error: string | null
  startedAt: string
  finishedAt: string | null
}

export type PushReceipt = {
  batchId: string
  pushedAt: string
  /** 同一批次重复推送时为 true，完全沿用第一次结果 */
  duplicated: boolean
  /** 新纳入目录的课程 */
  accepted: string[]
  /** 修订号与目录一致，未做任何处理 */
  unchanged: string[]
  /** 修订号前进但先修未变，只刷新确认基准，不失效 */
  refreshed: string[]
  /** 先修发生变化的课程 */
  prereqChanged: string[]
  invalidatedMappings: string[]
  invalidatedCoverage: string[]
  enqueuedPending: string[]
}

export type ReconState = {
  term: Term
  /** key = `${term}#${code}` */
  catalog: Record<string, ExternalCourse>
  mappings: LocalMapping[]
  pending: PendingReview[]
  coverage: CoverageResult[]
  batches: Record<string, BatchState>
  pushReceipts: Record<string, PushReceipt>
}

export function catalogKey(term: Term, code: string): string {
  return `${term}#${code}`
}

export function samePrerequisites(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const left = [...a].sort()
  const right = [...b].sort()
  return left.every((code, index) => code === right[index])
}
