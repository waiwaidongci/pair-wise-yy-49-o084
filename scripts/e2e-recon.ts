// 端到端对账演练：对照 HTTP 服务依次走完六条规则
const BASE = process.env.B ?? 'http://localhost:62049'

async function api(path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, body
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : undefined)
  return res.json()
}

const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
  if (!cond) process.exitCode = 1
}
const m = (state: any, id: string) => state.mappings.find((x: any) => x.id === id)
const cov = (state: any, id: string) => state.coverage.find((x: any) => x.requirementId === id)

// 0. 重置
await api('/api/recon', { action: 'reset' })
await api('/api/recon', { action: 'recompute' })
let r: any

// 初始：LM-05 缺编号被排除，GR-03 覆盖中
r = await api('/api/recon')
check('初始 GR-12 为 gap 且 LM-05 作为缺编号历史数据被排除', cov(r.state, 'GR-12').status === 'gap' && cov(r.state, 'GR-12').excludedLegacy[0]?.mappingId === 'LM-05')
check('初始 GR-03 覆盖达成（基于 C-308 R11）', cov(r.state, 'GR-03').status === 'covered' && cov(r.state, 'GR-03').basedOnRevisions['C-308'] === 11)

// 1. 推送 W41：C-308 先修改
r = await api('/api/recon/push', await fetch(`${BASE}/__recon/w41.json`).then((x) => x.json()))
check('W41 收据：C-308 先修变化，LM-03/LM-04 失效，GR-03/GR-06 覆盖失效',
  r.receipt.prereqChanged.join() === 'C-308' &&
  r.receipt.invalidatedMappings.sort().join() === 'LM-03,LM-04' &&
  r.receipt.invalidatedCoverage.sort().join() === 'GR-03,GR-06')
check('LM-04 旧人工值 0.7 保留，与来源漂移入待核',
  m(r.state, 'LM-04').confirmedWeight === 0.7 &&
  r.state.pending.some((p: any) => p.kind === 'manual-drift' && p.mappingId === 'LM-04' && p.proposedWeight === 0.7))

// 1b. 同一修订重复推送沿用第一次结果
r = await api('/api/recon/push', await fetch(`${BASE}/__recon/w41.json`).then((x) => x.json()))
check('W41 重复推送：duplicated=true，沿用首次收据', r.receipt.duplicated === true && r.receipt.prereqChanged.join() === 'C-308')

// 2. 批次在 C-308 失败
r = await api('/api/recon/batch', { batchId: 'B41', failOn: 'C-308' })
check('批次 B41 失败于 C-308，检查点止于 C-205',
  r.ok === false && r.batch.status === 'failed' && r.batch.failedCourse === 'C-308' && r.batch.lastCompletedCourse === 'C-205')

// 2b. 恢复
r = await api('/api/recon/batch', { batchId: 'B41' })
check('批次 B41 恢复完成，仅续写 C-308；C-101 标记 skippedConfirmed',
  r.batch.status === 'completed' &&
  m(r.state, 'LM-03').status === 'reconciled' && m(r.state, 'LM-03').baselineRevision === 12 &&
  r.batch.processed.find((p: any) => p.code === 'C-101').skippedConfirmed === true)

// 3. 两名负责人同基准并发确认（同批两个请求）
const [a, b] = await Promise.all([
  api('/api/recon/confirm', { mappingId: 'LM-03', owner: '王磊', weight: 1, expectedRevision: 12 }),
  api('/api/recon/confirm', { mappingId: 'LM-03', owner: '陈静', weight: 0.85, expectedRevision: 12 }),
])
const outcomes = [a.outcome.outcome, b.outcome.outcome].sort()
const winner = [a, b].find((x) => x.outcome.outcome === 'committed')
const loser = [a, b].find((x) => x.outcome.outcome === 'lost-race')
check('并发确认：一方 committed 一方 lost-race', outcomes.join(',') === 'committed,lost-race', `结果=${outcomes.join('/')}`)
check('写入权重来自胜出方，落败内容进入待核队列',
  m(winner.state, 'LM-03').confirmedWeight === 1 &&
  loser.state.pending.some((p: any) => p.kind === 'confirm-loser' && p.proposedWeight === 0.85 && p.owner === '陈静'))
check('胜出后覆盖 GR-03 恢复 covered，基准 R12',
  cov(winner.state, 'GR-03').status === 'covered' && cov(winner.state, 'GR-03').basedOnRevisions['C-308'] === 12)

// 3b. 按旧修订提交 → revision-moved
r = await api('/api/recon/batch', { batchId: 'B41c' }) // 把 LM-04 重算出来
r = await api('/api/recon/confirm', { mappingId: 'LM-04', owner: '陈静', weight: 0.6, expectedRevision: 11 })
check('按旧基准 R11 提交 LM-04：revision-moved，不写入',
  r.outcome.outcome === 'revision-moved' && m(r.state, 'LM-04').status === 'reconciled')

// 4. stale 状态下提交人工调整，不覆盖来源
r = await api('/api/recon/manual', { mappingId: 'LM-04', weight: 0.55, owner: '王磊', note: '先修已变仍想压低权重' })
check('来源已变时人工值不静默覆盖：applied=false 并入待核',
  r.result.applied === false && m(r.state, 'LM-04').manual.weight === 0.55 && m(r.state, 'LM-04').confirmedWeight === 0.7)

// 5. 补编号：目录没有 C-999 → 拒绝
r = await api('/api/recon/backfill', { mappingId: 'LM-05', code: 'C-999' })
check('目录缺失编号 C-999：补编号被拒', r.ok === false && r.result.outcome === 'catalog-missing')

// W42 纳入 C-330 后补编号 → 批次 → 确认 → 计入覆盖
r = await api('/api/recon/push', await fetch(`${BASE}/__recon/w42.json`).then((x) => x.json()))
check('W42 纳入 C-240/C-330', r.receipt.accepted.sort().join() === 'C-240,C-330')
r = await api('/api/recon/backfill', { mappingId: 'LM-05', code: 'C-330' })
check('LM-05 补齐编号后转为 stale', r.ok === true && m(r.state, 'LM-05').status === 'stale' && m(r.state, 'LM-05').courseCode === 'C-330')
r = await api('/api/recon/batch', { batchId: 'B42' })
check('B42 把 LM-05 重算到 reconciled', m(r.state, 'LM-05').status === 'reconciled')
r = await api('/api/recon/confirm', { mappingId: 'LM-05', owner: '赵晓', weight: 0.95, expectedRevision: 1 })
check('LM-05 确认后 GR-12 覆盖达成，不再有 excludedLegacy',
  r.outcome.outcome === 'committed' && cov(r.state, 'GR-12').status === 'covered' &&
  cov(r.state, 'GR-12').contributions[0].courseCode === 'C-330' && cov(r.state, 'GR-12').excludedLegacy.length === 0)

// 6. 重算：C-240 已在目录，GR-03 未解析先修清零
r = await api('/api/recon', { action: 'recompute' })
check('C-240 目录补齐后 GR-03 无未解析先修', cov(r.state, 'GR-03').unresolvedPrereqs.length === 0)

console.log('\n待核队列条数：', (await api('/api/recon')).state.pending.length)
