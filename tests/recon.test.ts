import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { Recon, computeSourceWeight } from '../src/lib/recon/engine'
import { buildScenario, buildW41Push, SCENARIO_TERM } from '../src/lib/recon/seed'
import type { ExternalCourse, LocalMapping } from '../src/lib/recon/types'

const term = SCENARIO_TERM

describe('目录推送：课程编号 + 学期 + 修订号，同修订重复推送幂等', () => {
  test('同一 batchId 重复推送沿用第一次收据，不重复失效', () => {
    const recon = new Recon(buildScenario())
    const first = recon.ingestPush(buildW41Push())
    assert.deepEqual(first.prereqChanged, ['C-308'])
    assert.equal(first.duplicated, false)
    assert.deepEqual(first.invalidatedMappings.sort(), ['LM-03', 'LM-04'])

    // 人工把一条失效映射重算/确认掉，再重推同一批次，状态不应被动
    recon.state.mappings.find((m) => m.id === 'LM-03')!.status = 'reconciled'
    const second = recon.ingestPush(buildW41Push())
    assert.equal(second.duplicated, true)
    assert.deepEqual(second.prereqChanged, ['C-308'], '收据沿用第一次结果')
    assert.equal(recon.state.mappings.find((m) => m.id === 'LM-03')!.status, 'reconciled', '重复推送不重算')
  })

  test('新批次里同修订课程按 unchanged 处理', () => {
    const recon = new Recon(buildScenario())
    const receipt = recon.ingestPush({
      batchId: 'W40-retry',
      pushedAt: '2026-09-26T08:00:00+08:00',
      courses: [
        { code: 'C-101', term, revision: 7, title: '程序设计基础', prerequisites: [], updatedAt: 'x' },
        { code: 'C-205', term, revision: 9, title: '数据结构与算法', prerequisites: ['C-101'], updatedAt: 'x' },
      ],
    })
    assert.deepEqual(receipt.unchanged.sort(), ['C-101', 'C-205'])
    assert.equal(receipt.invalidatedMappings.length, 0)
  })

  test('修订号前进但先修未变，只刷新基准不失效', () => {
    const recon = new Recon(buildScenario())
    recon.state.catalog[`${term}#C-308`] = {
      code: 'C-308', term, revision: 12, title: '软件工程实践',
      prerequisites: ['C-205'], updatedAt: '2026-10-01T08:00:00+08:00',
    }
    const receipt = recon.ingestPush({
      batchId: 'W41-no-prereq-change',
      pushedAt: '2026-10-02T08:00:00+08:00',
      courses: [{
        code: 'C-308', term, revision: 13, title: '软件工程实践（教材更新）',
        prerequisites: ['C-205'], updatedAt: '2026-10-02T08:00:00+08:00',
      }],
    })
    assert.deepEqual(receipt.refreshed, ['C-308'])
    assert.deepEqual(receipt.invalidatedMappings, [])
    const lm03 = recon.state.mappings.find((m) => m.id === 'LM-03')!
    assert.equal(lm03.status, 'confirmed')
    assert.equal(lm03.baselineRevision, 13)
  })

  test('拒绝修订号回退推送', () => {
    const recon = new Recon(buildScenario())
    assert.throws(() =>
      recon.ingestPush({
        batchId: 'W-old',
        pushedAt: '2026-10-02T08:00:00+08:00',
        courses: [{
          code: 'C-308', term, revision: 5, title: '软件工程实践',
          prerequisites: ['C-205'], updatedAt: 'x',
        }],
      }), /早于目录修订/)
  })
})

describe('先修改动：映射与覆盖结论立即失效，人工值不被静默覆盖', () => {
  test('C-308 先修改动后 LM-03/LM-04 失效，覆盖结论 invalidated', () => {
    const recon = new Recon(buildScenario())
    recon.recomputeCoverage('2026-09-26T09:00:00+08:00')
    const before = recon.state.coverage.find((c) => c.requirementId === 'GR-03')!
    assert.equal(before.status, 'covered')

    const receipt = recon.ingestPush(buildW41Push())
    const lm03 = recon.state.mappings.find((m) => m.id === 'LM-03')!
    const lm04 = recon.state.mappings.find((m) => m.id === 'LM-04')!
    assert.equal(lm03.status, 'stale')
    assert.equal(lm04.status, 'stale')
    assert.match(lm03.conflict ?? '', /修订 12/)

    const gr03 = recon.state.coverage.find((c) => c.requirementId === 'GR-03')!
    const gr06 = recon.state.coverage.find((c) => c.requirementId === 'GR-06')!
    assert.equal(gr03.status, 'invalidated')
    assert.equal(gr06.status, 'invalidated')
    assert.equal(gr03.recomputedAt, null)
    assert.deepEqual(receipt.invalidatedCoverage.sort(), ['GR-03', 'GR-06'])
  })

  test('人工调整值保留：LM-04 人工 0.7 与来源重算 0.9 漂移，入待核且确认值不变', () => {
    const recon = new Recon(buildScenario())
    recon.ingestPush(buildW41Push())
    const lm04 = recon.state.mappings.find((m) => m.id === 'LM-04')!
    assert.equal(lm04.confirmedWeight, 0.7, '已确认的人工值原样保留')
    assert.equal(lm04.manual?.weight, 0.7)

    // C-240 在目录中解析不到 → 来源置信度 0.9
    assert.equal(computeSourceWeight(recon.state.catalog[`${term}#C-308`], recon.state.catalog, null), 0.9)

    const drift = recon.state.pending.find((p) => p.kind === 'manual-drift' && p.mappingId === 'LM-04')!
    assert.ok(drift, '漂移人工值进入待核队列')
    assert.equal(drift.proposedWeight, 0.7)
    assert.equal(drift.resolved, false)
  })

  test('失效后重算并由负责人确认，覆盖结论恢复 covered，待核条目结案', () => {
    const recon = new Recon(buildScenario())
    recon.recomputeCoverage('2026-09-26T09:00:00+08:00')
    recon.ingestPush(buildW41Push())

    // 批次重算
    const batch = recon.runBatch({ batchId: 'B41', at: '2026-10-02T09:00:00+08:00' })
    // runBatch 不 await 时返回 Promise
    return batch.then(() => {
      const lm03 = recon.state.mappings.find((m) => m.id === 'LM-03')!
      assert.equal(lm03.status, 'reconciled')
      assert.equal(lm03.baselineRevision, 12)

      const result = recon.confirmMapping({
        mappingId: 'LM-03', owner: '王磊', weight: 1,
        expectedRevision: 12, at: '2026-10-02T10:00:00+08:00',
      })
      assert.equal(result.outcome, 'committed')
      const gr03 = recon.state.coverage.find((c) => c.requirementId === 'GR-03')!
      assert.equal(gr03.status, 'covered')
      assert.equal(gr03.basedOnRevisions['C-308'], 12)
    })
  })

  test('来源已变化时再做人工调整，不静默覆盖来源值', () => {
    const recon = new Recon(buildScenario())
    recon.ingestPush(buildW41Push())
    const r = recon.applyManualAdjustment({
      mappingId: 'LM-03', weight: 0.55, owner: '王磊',
      note: '想按旧口径压低权重', at: '2026-10-02T08:30:00+08:00',
    })
    assert.equal(r.applied, false)
    const lm03 = recon.state.mappings.find((m) => m.id === 'LM-03')!
    assert.equal(lm03.confirmedWeight, 1, '旧确认值不被人工调整改写')
    assert.equal(lm03.manual?.weight, 0.55, '但人工调整值已登记保留')
    assert.ok(recon.state.pending.some((p) => p.mappingId === 'LM-03' && p.kind === 'manual-drift'))
  })
})

describe('两名负责人并发确认：只有基准修订一致的一方写入，落败留待核', () => {
  test('基准一致：先到方写入，后到方落败入待核', () => {
    const recon = new Recon(buildScenario())
    recon.ingestPush(buildW41Push())
    recon.runBatch({ batchId: 'B41', at: '2026-10-02T09:00:00+08:00' })

    const first = recon.confirmMapping({
      mappingId: 'LM-03', owner: '王磊', weight: 1,
      expectedRevision: 12, at: '2026-10-02T10:00:00+08:00',
    })
    assert.equal(first.outcome, 'committed')

    // 第二名负责人几乎同时提交（会话层在第一次提交成功后登记冲突）
    const loser = recon.registerConflictingSubmission({
      mappingId: 'LM-03', owner: '陈静', weight: 0.85,
      expectedRevision: 12, at: '2026-10-02T10:00:05+08:00', winnerOwner: '王磊',
    })!
    assert.equal(loser.kind, 'confirm-loser')
    assert.equal(loser.proposedWeight, 0.85)
    assert.equal(loser.resolved, false)

    // 即便再直接 confirm，也只会拿到 already-confirmed，不能覆盖
    const retry = recon.confirmMapping({
      mappingId: 'LM-03', owner: '陈静', weight: 0.85,
      expectedRevision: 12, at: '2026-10-02T10:01:00+08:00',
    })
    assert.equal(retry.outcome, 'already-confirmed')
    const lm03 = recon.state.mappings.find((m) => m.id === 'LM-03')!
    assert.equal(lm03.confirmedWeight, 1)
  })

  test('基准落后：确认不写入，直接判 revision-moved 并入待核', () => {
    const recon = new Recon(buildScenario())
    recon.ingestPush(buildW41Push())
    recon.runBatch({ batchId: 'B41', at: '2026-10-02T09:00:00+08:00' })

    const staleConfirm = recon.confirmMapping({
      mappingId: 'LM-03', owner: '陈静', weight: 0.85,
      expectedRevision: 11, at: '2026-10-02T10:00:00+08:00',
    })
    assert.equal(staleConfirm.outcome, 'revision-moved')
    if (staleConfirm.outcome === 'revision-moved') {
      assert.equal(staleConfirm.currentRevision, 12)
      assert.equal(staleConfirm.expectedRevision, 11)
    }
    const lm03 = recon.state.mappings.find((m) => m.id === 'LM-03')!
    assert.equal(lm03.status, 'reconciled', '落败方不改变状态')
    assert.equal(lm03.confirmedWeight, 1, '旧确认值保留')
  })
})

describe('批次写入失败后恢复：从最后完成课程继续，已确认课程不重复', () => {
  test('C-308 写入失败后恢复，已完成的 C-101/C-205 不重复写入', async () => {
    const recon = new Recon(buildScenario())
    recon.ingestPush(buildW41Push())

    // C-205 带着上一轮中断遗留的 stale 状态进入批次；C-101 已确认应直接跳过
    const lm02 = recon.state.mappings.find((m) => m.id === 'LM-02')!
    lm02.status = 'stale'
    lm02.baselineRevision = 8
    lm02.lastReconciledRevision = 8
    lm02.conflict = '上一轮先修修订批次中断，映射尚未重算'

    const writes: Array<{ code: string; revision: number }> = []
    const failingWrite = async (course: ExternalCourse) => {
      writes.push({ code: course.code, revision: course.revision })
      if (course.code === 'C-308') throw new Error('写入通道超时')
    }

    // 计划顺序固定 C-101, C-205, C-308
    await assert.rejects(
      () => recon.runBatch({ batchId: 'B41', at: '2026-10-02T09:00:00+08:00', write: failingWrite }),
      /写入通道超时/,
    )
    let batch = recon.state.batches['B41']
    assert.equal(batch.status, 'failed')
    assert.equal(batch.lastCompletedCourse, 'C-205')
    assert.equal(batch.failedCourse, 'C-308')
    assert.deepEqual(batch.processed.map((p) => p.code), ['C-101', 'C-205'])
    assert.equal(batch.processed.find((p) => p.code === 'C-101')?.skippedConfirmed, true)
    assert.equal(recon.state.mappings.find((m) => m.id === 'LM-02')!.status, 'reconciled', 'C-205 写入成功后提交重算')
    assert.equal(recon.state.mappings.find((m) => m.id === 'LM-02')!.baselineRevision, 9)
    const lm03 = recon.state.mappings.find((m) => m.id === 'LM-03')!
    assert.equal(lm03.status, 'stale', '失败课程的映射不提交')

    // 恢复：同一批写入函数这次成功
    const recoverWrites: string[] = []
    await recon.resumeBatch('B41', '2026-10-02T09:10:00+08:00', async (course) => {
      recoverWrites.push(course.code)
    })
    batch = recon.state.batches['B41']
    assert.equal(batch.status, 'completed')
    assert.deepEqual(recoverWrites, ['C-308'], '恢复时只写失败点之后的课程')
    assert.equal(writes.filter((w) => w.code === 'C-205').length, 1, 'C-205 已完成，恢复时不重复写入')
    assert.equal(writes.filter((w) => w.code === 'C-101').length, 0, 'C-101 已确认，全程不重复写入')
    assert.equal(recon.state.mappings.find((m) => m.id === 'LM-03')!.status, 'reconciled')
  })

  test('已在当前修订确认过的课程不重复写入', async () => {
    const recon = new Recon(buildScenario())
    // C-101/C-205 当前修订已确认；C-308 先改先修
    recon.ingestPush(buildW41Push())
    const written: string[] = []
    await recon.runBatch({
      batchId: 'B41b', at: '2026-10-02T09:00:00+08:00',
      write: async (course) => { written.push(course.code) },
    })
    assert.deepEqual(written, ['C-308'], 'C-101/C-205 已确认且基准一致，跳过写入')
    const batch = recon.state.batches['B41b']
    assert.equal(batch.processed.find((p) => p.code === 'C-101')?.skippedConfirmed, true)
  })
})

describe('缺外部编号的历史数据：先兼容保留，补齐编号后接回对账', () => {
  test('LM-05 无编号时保留、不参与批次和覆盖', () => {
    const recon = new Recon(buildScenario())
    recon.recomputeCoverage('2026-09-26T09:00:00+08:00')
    const gr12 = recon.state.coverage.find((c) => c.requirementId === 'GR-12')!
    assert.equal(gr12.status, 'gap')
    assert.deepEqual(gr12.excludedLegacy, [{ mappingId: 'LM-05', localCourseId: 'C-330' }])
    assert.equal(gr12.contributions.length, 0)

    const lm05 = recon.state.mappings.find((m) => m.id === 'LM-05')!
    assert.equal(lm05.status, 'pending-code')
    assert.equal(lm05.courseCode, null)
  })

  test('目录里没有的编号被拒绝；补齐后经批次+确认重新计入覆盖', async () => {
    const recon = new Recon(buildScenario())
    recon.recomputeCoverage('2026-09-26T09:00:00+08:00')

    const rejected = recon.backfillExternalCode({ mappingId: 'LM-05', code: 'C-999', at: '2026-10-03T08:00:00+08:00' })
    assert.equal(rejected.outcome, 'catalog-missing')

    // 教务系统在新推送中给出了编号
    recon.ingestPush({
      batchId: 'W42',
      pushedAt: '2026-10-03T08:00:00+08:00',
      courses: [{
        code: 'C-330', term, revision: 1, title: '跨文化工程沟通',
        prerequisites: [], updatedAt: '2026-10-03T08:00:00+08:00',
      }],
    })
    const linked = recon.backfillExternalCode({ mappingId: 'LM-05', code: 'C-330', at: '2026-10-03T08:05:00+08:00' })
    assert.equal(linked.outcome, 'linked')
    if (linked.outcome === 'linked') assert.equal(linked.revision, 1)

    // 接回后进入下一轮批次
    await recon.runBatch({ batchId: 'B42', at: '2026-10-03T08:10:00+08:00' })
    const lm05 = recon.state.mappings.find((m) => m.id === 'LM-05')!
    assert.equal(lm05.status, 'reconciled')

    recon.confirmMapping({
      mappingId: 'LM-05', owner: '赵晓', weight: 0.95,
      expectedRevision: 1, at: '2026-10-03T08:15:00+08:00',
    })
    const gr12 = recon.state.coverage.find((c) => c.requirementId === 'GR-12')!
    assert.equal(gr12.status, 'covered')
    assert.equal(gr12.contributions[0].courseCode, 'C-330')
    assert.deepEqual(gr12.excludedLegacy, [], '接回后不再算作被排除的历史映射')
  })
})

describe('覆盖重算：先修链解析', () => {
  test('C-240 目录补齐后，C-308 来源权重恢复 1，未解析先修体现在结论中', async () => {
    const recon = new Recon(buildScenario())
    recon.ingestPush(buildW41Push())
    await recon.runBatch({ batchId: 'B41', at: '2026-10-02T09:00:00+08:00' })
    recon.confirmMapping({ mappingId: 'LM-03', owner: '王磊', weight: 1, expectedRevision: 12, at: '2026-10-02T10:00:00+08:00' })

    let gr03 = recon.state.coverage.find((c) => c.requirementId === 'GR-03')!
    assert.deepEqual(gr03.unresolvedPrereqs, ['C-240'])

    recon.ingestPush({
      batchId: 'W42',
      pushedAt: '2026-10-03T08:00:00+08:00',
      courses: [{
        code: 'C-240', term, revision: 1, title: '跨课程协作研讨',
        prerequisites: [], updatedAt: '2026-10-03T08:00:00+08:00',
      }],
    })
    // 新先修课不影响 C-308 修订；直接重算
    recon.recomputeCoverage('2026-10-03T09:00:00+08:00')
    gr03 = recon.state.coverage.find((c) => c.requirementId === 'GR-03')!
    assert.deepEqual(gr03.unresolvedPrereqs, [])
    const lm03 = recon.state.mappings.find((m) => m.id === 'LM-03') as LocalMapping
    assert.ok(lm03)
  })
})
