import { createReconState } from './engine'
import type { ReconState } from './types'

const TERM = '2026-FALL'

/**
 * 对账演示场景：
 * - LM-01/02/03/04 已接外部编号，LM-05 是历史映射缺外部编号（先兼容保留）
 * - W40 推送为当前基准；W41 改了 C-308 的先修链
 */
export function buildScenario(): ReconState {
  const state = createReconState(TERM)
  state.catalog = {
    [`${TERM}#C-101`]: {
      code: 'C-101',
      term: TERM,
      revision: 7,
      title: '程序设计基础',
      prerequisites: [],
      updatedAt: '2026-09-01T08:00:00+08:00',
    },
    [`${TERM}#C-205`]: {
      code: 'C-205',
      term: TERM,
      revision: 9,
      title: '数据结构与算法',
      prerequisites: ['C-101'],
      updatedAt: '2026-09-01T08:00:00+08:00',
    },
    [`${TERM}#C-308`]: {
      code: 'C-308',
      term: TERM,
      revision: 11,
      title: '软件工程实践',
      prerequisites: ['C-205'],
      updatedAt: '2026-09-01T08:00:00+08:00',
    },
  }

  state.mappings = [
    {
      id: 'LM-01',
      requirementId: 'GR-01',
      courseCode: 'C-101',
      localCourseId: 'C-101',
      term: TERM,
      baselineRevision: 7,
      status: 'confirmed',
      sourceWeight: 1,
      confirmedWeight: 0.9,
      manual: { weight: 0.9, owner: '张敏', note: '按达成度下调', at: '2026-09-10T10:00:00+08:00' },
      lastReconciledRevision: 7,
      conflict: null,
    },
    {
      id: 'LM-02',
      requirementId: 'GR-03',
      courseCode: 'C-205',
      localCourseId: 'C-205',
      term: TERM,
      baselineRevision: 9,
      status: 'confirmed',
      sourceWeight: 1,
      confirmedWeight: 0.8,
      manual: { weight: 0.8, owner: '李航', note: '设计实践占比', at: '2026-09-10T10:05:00+08:00' },
      lastReconciledRevision: 9,
      conflict: null,
    },
    {
      id: 'LM-03',
      requirementId: 'GR-03',
      courseCode: 'C-308',
      localCourseId: 'C-308',
      term: TERM,
      baselineRevision: 11,
      status: 'confirmed',
      sourceWeight: 1,
      confirmedWeight: 1,
      manual: { weight: 1, owner: '王磊', note: '核心支撑课程', at: '2026-09-10T10:10:00+08:00' },
      lastReconciledRevision: 11,
      conflict: null,
    },
    {
      id: 'LM-04',
      requirementId: 'GR-06',
      courseCode: 'C-308',
      localCourseId: 'C-308',
      term: TERM,
      baselineRevision: 11,
      status: 'confirmed',
      sourceWeight: 1,
      confirmedWeight: 0.7,
      manual: { weight: 0.7, owner: '王磊', note: '合规案例计入', at: '2026-09-10T10:12:00+08:00' },
      lastReconciledRevision: 11,
      conflict: null,
    },
    {
      id: 'LM-05',
      requirementId: 'GR-12',
      courseCode: null,
      localCourseId: 'C-330',
      term: TERM,
      baselineRevision: null,
      status: 'pending-code',
      sourceWeight: 1,
      confirmedWeight: null,
      manual: null,
      lastReconciledRevision: null,
      conflict: '历史数据缺少外部课程编号，暂不参与对账与覆盖计算',
    },
  ]

  state.pushReceipts['W40'] = {
    batchId: 'W40',
    pushedAt: '2026-09-25T08:00:00+08:00',
    duplicated: false,
    accepted: ['C-101', 'C-205', 'C-308'],
    unchanged: [],
    refreshed: [],
    prereqChanged: [],
    invalidatedMappings: [],
    invalidatedCoverage: [],
    enqueuedPending: [],
  }

  return state
}

export const SCENARIO_TERM = TERM

/** W41：C-308 修订 11 → 12，先修由 C-205 改为 [C-205, C-240]（跨课程协作先修） */
export function buildW41Push() {
  return {
    batchId: 'W41',
    pushedAt: '2026-10-02T08:00:00+08:00',
    courses: [
      {
        code: 'C-101',
        term: SCENARIO_TERM,
        revision: 7,
        title: '程序设计基础',
        prerequisites: [],
        updatedAt: '2026-10-02T08:00:00+08:00',
      },
      {
        code: 'C-205',
        term: SCENARIO_TERM,
        revision: 9,
        title: '数据结构与算法',
        prerequisites: ['C-101'],
        updatedAt: '2026-10-02T08:00:00+08:00',
      },
      {
        code: 'C-308',
        term: SCENARIO_TERM,
        revision: 12,
        title: '软件工程实践',
        prerequisites: ['C-205', 'C-240'],
        updatedAt: '2026-10-02T08:00:00+08:00',
      },
    ],
  }
}
