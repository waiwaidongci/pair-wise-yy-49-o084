/**
 * 服务端对账状态单例：模块级内存态，供 API 路由读写。
 * 种子数据刻意覆盖五种情形：
 *  - C-101 已确认但被新修订的先修变化置为 stale，人工调整被暂停（演示来源变化不被覆盖）
 *  - C-205 已确认且与最新修订一致（演示已确认不重复）
 *  - C-308 缺少外部编号（演示兼容保留，补齐后接回对账）
 *  - CS308 已有推送在台账中等候（演示补齐编号即接回对账）
 */
import { initialState, type GraphView, type ManualOverride, type ReconcileState } from './engine'
import { mappings, nodes } from '$lib/seed'

export const SEMESTER = '2026-秋'

/** 本地课程 -> 外部课程编号；null 表示已有数据缺少外部编号，先兼容保留 */
const externalCourseNo: Record<string, string | null> = {
  'C-101': 'CS101',
  'C-205': 'CS205',
  'C-308': null,
}

function buildGraph(): GraphView {
  return {
    courses: nodes
      .filter((n) => n.type === '课程')
      .map((n) => ({ id: n.id, name: n.label.split('\n')[0], externalCourseNo: externalCourseNo[n.id] ?? null })),
    requirements: nodes
      .filter((n) => n.type === '毕业要求')
      .map((n) => ({ id: n.id, name: n.label.split('\n')[0] })),
    supports: mappings
      .filter((m) => m.relation === '支撑' && m.source.startsWith('GR'))
      .map((m) => ({ source: m.source, target: m.target, weight: m.weight })),
  }
}

const graph = buildGraph()

const seedPushes = [
  {
    courseNo: 'CS101',
    name: '程序设计基础',
    semester: SEMESTER,
    revisionNo: 'R1',
    prerequisites: [],
    receivedAt: '2026-09-01T09:00:00+08:00',
  },
  {
    courseNo: 'CS101',
    name: '程序设计基础',
    semester: SEMESTER,
    revisionNo: 'R2',
    prerequisites: ['CS100'],
    receivedAt: '2026-09-15T09:00:00+08:00',
  },
  {
    courseNo: 'CS205',
    name: '数据结构与算法',
    semester: SEMESTER,
    revisionNo: 'R1',
    prerequisites: ['CS101'],
    receivedAt: '2026-09-01T09:00:00+08:00',
  },
  {
    courseNo: 'CS308',
    name: '软件工程实践',
    semester: SEMESTER,
    revisionNo: 'R1',
    prerequisites: ['CS205'],
    receivedAt: '2026-09-20T09:00:00+08:00',
  },
]

const confirmed: Record<string, string> = {
  'C-101': 'R1',
  'C-205': 'R1',
}

const overrides: Record<string, ManualOverride[]> = {
  'C-101': [
    {
      mappingKey: 'GR-01->C-101:支撑',
      field: 'weight',
      value: 0.95,
      reason: '课程组自评：工程知识支撑权重上调',
      baselineRevision: 'R1',
    },
  ],
}

let state: ReconcileState | null = null

export function getGraph(): GraphView {
  return graph
}

export function getState(): ReconcileState {
  if (!state) {
    state = initialState({
      graph,
      pushes: seedPushes,
      semester: SEMESTER,
      confirmed,
      overrides,
      now: '2026-09-29T08:42:00+08:00',
    })
  }
  return state
}

export function commit(next: ReconcileState): ReconcileState {
  state = next
  return state
}
