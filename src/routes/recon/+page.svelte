<script lang="ts">
  import { onMount } from 'svelte'
  import { SCENARIO_TERM } from '$lib/recon/seed'
  import type { ReconState, MappingStatus, BatchState, PendingReview, CoverageResult } from '$lib/recon/types'

  type Snapshot = { state: ReconState; writerLog: Array<{ at: string; code: string; revision: number; outcome: string }> }
  let snapshot = $state<Snapshot | null>(null)
  let logs = $state<Array<{ at: string; tone: 'ok' | 'warn' | 'err'; text: string }>>([])
  let busy = $state(false)

  // 确认表单 / 并发演示
  let confirmMapping = $state('LM-03')
  let confirmOwner = $state('王磊')
  let confirmWeight = $state(1)
  let confirmRevision = $state(12)

  // 批次表单
  let batchId = $state('B41')
  let failOn = $state('C-308')

  // 补编号表单
  let backfillMapping = $state('LM-05')
  let backfillCode = $state('C-330')

  const statusMeta: Record<MappingStatus, { label: string; cls: string }> = {
    'pending-code': { label: '缺编号·兼容保留', cls: 'st-pending' },
    stale: { label: '失效待重算', cls: 'st-stale' },
    reconciled: { label: '已重算待确认', cls: 'st-reconciled' },
    confirmed: { label: '已确认', cls: 'st-confirmed' },
  }

  const st = () => snapshot?.state
  const catalogCourses = $derived(st() ? Object.values(st()!.catalog) : [])
  const pendingList = $derived(st()?.pending ?? [])
  const batches = $derived(st() ? Object.values(st()!.batches) : [])
  const coverageSorted = $derived(
    st() ? [...st()!.coverage].sort((a, b) => a.requirementId.localeCompare(b.requirementId)) : [],
  )

  function log(tone: 'ok' | 'warn' | 'err', text: string) {
    logs = [{ at: new Date().toLocaleTimeString('zh-CN'), tone, text }, ...logs].slice(0, 40)
  }

  async function call(path: string, body?: unknown, init?: RequestInit) {
    busy = true
    try {
      const res = await fetch(path, {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        ...init,
      })
      const data = await res.json()
      if (data.state) snapshot = { state: data.state, writerLog: data.writerLog ?? snapshot?.writerLog ?? [] }
      return data
    } finally {
      busy = false
    }
  }

  async function refresh() {
    const data = await call('/api/recon')
    if (data.state) snapshot = data
  }

  async function reset() {
    const data = await call('/api/recon', { action: 'reset' })
    logs = []
    log('ok', '会话已重置到 W40 基准场景（LM-05 缺外部编号，兼容保留）')
    await recompute()
    return data
  }

  async function recompute() {
    const data = await call('/api/recon', { action: 'recompute' })
    log('ok', `毕业要求覆盖结论已按当前目录重算（${data.coverage.length} 条）`)
  }

  async function pushW41() {
    const body = await fetch('/__recon/w41.json').then((r) => r.json())
    const data = await call('/api/recon/push', body)
    if (!data.ok) return log('err', `推送被拒绝：${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`)
    const r = data.receipt
    if (r.duplicated) log('warn', `批次 ${r.batchId} 重复推送 → 沿用第一次收据，未做任何重算`)
    else
      log(
        r.prereqChanged.length ? 'warn' : 'ok',
        `批次 ${r.batchId}：新收 ${r.accepted.join('、') || '—'}；未变 ${r.unchanged.join('、') || '—'}；` +
          `先修变化 ${r.prereqChanged.join('、') || '—'}；失效映射 ${r.invalidatedMappings.join('、') || '—'}；` +
          `失效覆盖 ${r.invalidatedCoverage.join('、') || '—'}；待核 ${r.enqueuedPending.length} 条`,
      )
  }

  async function pushW42() {
    const body = await fetch('/__recon/w42.json').then((r) => r.json())
    const data = await call('/api/recon/push', body)
    if (!data.ok) return log('err', `推送被拒绝：${typeof data.error === 'string' ? data.error : JSON.stringify(data.error)}`)
    log('ok', `批次 W42 已纳入新课程：${data.receipt.accepted.join('、')}`)
  }

  async function runBatch(doResume = false) {
    const body: Record<string, unknown> = { batchId }
    if (!doResume) body.failOn = failOn || undefined
    const data = await call('/api/recon/batch', body)
    if (!data.ok) {
      log('err', `批次 ${batchId} 在课程 ${data.batch?.failedCourse} 写入失败：${data.error}`)
      return
    }
    const b: BatchState = data.batch
    log(
      'ok',
      `${doResume ? '恢复' : '运行'}批次 ${b.batchId} 完成；检查点 ${b.processed.map((p) => `${p.code}${p.skippedConfirmed ? '(跳过已确认)' : ''}`).join(' → ')}`,
    )
  }

  async function confirm(ownerOverride?: string, revisionOverride?: number) {
    const data = await call('/api/recon/confirm', {
      mappingId: confirmMapping,
      owner: ownerOverride ?? confirmOwner,
      weight: confirmWeight,
      expectedRevision: revisionOverride ?? confirmRevision,
    })
    const o = data.outcome
    if (o.outcome === 'committed') log('ok', `${confirmOwner} 确认 ${confirmMapping} 写入成功（基准修订 ${o.revision}），待核 ${o.resolvedPending.length} 条结案`)
    else if (o.outcome === 'lost-race') log('err', `${ownerOverride} 并发确认落败：${o.winnerOwner} 已先写入，内容留作待核 ${o.pendingId}`)
    else if (o.outcome === 'revision-moved') log('err', `基准修订 ${o.expectedRevision} 已落后于目录 ${o.currentRevision}，未写入，留作待核 ${o.pendingId}`)
    else if (o.outcome === 'already-confirmed') log('warn', `${confirmMapping} 已在修订 ${o.revision} 确认，本次提交不覆盖`)
    else if (o.outcome === 'not-reconcilable') log('err', `${confirmMapping} 当前状态不可确认：${o.reason}`)
    else log('err', JSON.stringify(o))
  }

  async function concurrentConfirm() {
    busy = true
    const base = { mappingId: confirmMapping, weight: confirmWeight, expectedRevision: confirmRevision }
    try {
      const [a, b] = await Promise.all([
        fetch('/api/recon/confirm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...base, owner: '王磊' }) }).then((r) => r.json()),
        fetch('/api/recon/confirm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...base, owner: '陈静', weight: 0.85 }) }).then((r) => r.json()),
      ])
      for (const data of [a, b]) if (data.state) snapshot = { state: data.state, writerLog: snapshot?.writerLog ?? [] }
      const winner = [a.outcome, b.outcome].find((o) => o.outcome === 'committed')
      const loser = [a.outcome, b.outcome].find((o) => o.outcome === 'lost-race')
      if (winner && loser) log('err', `同基准并发：${loser.winnerOwner === '王磊' ? '王磊' : '陈静'}先写入，落败内容已入待核队列（基准修订 ${confirmRevision}）`)
      else log('warn', '并发结果：' + JSON.stringify([a.outcome.outcome, b.outcome.outcome]))
    } finally {
      busy = false
    }
  }

  async function staleRevisionConfirm() {
    await confirm('陈静', 11)
  }

  async function manualDrift() {
    const data = await call('/api/recon/manual', {
      mappingId: 'LM-03', weight: 0.55, owner: '王磊', note: '想按旧口径压低权重（先修已变）',
    })
    if (data.result?.applied) log('ok', '人工调整已写入（基准未变）')
    else log('warn', '来源已变化：人工值 0.55 已登记但不覆盖来源值，挂待核队列')
  }

  async function backfill() {
    const data = await call('/api/recon/backfill', { mappingId: backfillMapping, code: backfillCode })
    if (data.ok) log('ok', `${backfillMapping} 已补齐编号 ${backfillCode}，转为失效待重算，下一批次接回`)
    else log('err', `补编号失败：${typeof data.error === 'string' ? data.error : JSON.stringify(data.result ?? data.error)}`)
  }

  function coverageBadge(c: CoverageResult) {
    if (c.status === 'covered') return ['覆盖达成', 'cv-covered']
    if (c.status === 'gap') return ['覆盖缺口', 'cv-gap']
    return ['已失效·待重算', 'cv-invalid']
  }

  onMount(async () => {
    await reset()
  })
</script>

<svelte:head><title>目录对账工作台</title></svelte:head>

<section class="page">
  <div class="page-head">
    <div>
      <p class="eyebrow">CATALOG RECONCILIATION / 每周目录对账</p>
      <h1>外部课程目录 × 本地映射 × 毕业要求覆盖</h1>
      <p class="muted">
        对账学期 <b>{SCENARIO_TERM}</b>。推送按「编号 + 学期 + 修订号」幂等去重；先修一变，映射与覆盖结论立即失效；
        确认走基准修订 CAS，失败批次可从检查点续跑。
      </p>
    </div>
    <div class="actions">
      <button class="btn-secondary" onclick={refresh} disabled={busy}>刷新状态</button>
      <button class="btn-danger" onclick={reset} disabled={busy}>重置演练场景</button>
    </div>
  </div>

  {#if snapshot && st()}
    <div class="steps">
      <div class="step">
        <header><span>1</span><b>每周推送</b></header>
        <p>W41 中 C-308 修订 11→12，先修 [C-205] → [C-205, C-240]。同批次再推一次应原样沿用收据。</p>
        <div class="row">
          <button class="btn-primary" onclick={pushW41} disabled={busy}>推送 W41</button>
          <button class="btn-secondary" onclick={pushW41} disabled={busy}>同批次重复推送</button>
        </div>
        <p class="row"><button class="btn-secondary" onclick={pushW42} disabled={busy}>推送 W42（纳入 C-330 / C-240 新课程）</button></p>
      </div>

      <div class="step">
        <header><span>2</span><b>批次写入与恢复</b></header>
        <p>写入在 <input class="mini" bind:value={failOn} /> 失败一次后，按同一批次号恢复，只续写未完成课程。</p>
        <div class="row">
          批次号 <input class="mini mono" bind:value={batchId} />
          <button class="btn-primary" onclick={() => runBatch(false)} disabled={busy}>运行批次（注入失败）</button>
          <button class="btn-secondary" onclick={() => runBatch(true)} disabled={busy}>从检查点恢复</button>
        </div>
      </div>

      <div class="step">
        <header><span>3</span><b>负责人确认（CAS）</b></header>
        <p>
          映射 <select class="mini" bind:value={confirmMapping}>
            <option value="LM-03">LM-03 C-308→GR-03</option>
            <option value="LM-04">LM-04 C-308→GR-06</option>
            <option value="LM-05">LM-05 C-330→GR-12</option>
          </select>
          基准修订 <input class="mini mono" type="number" bind:value={confirmRevision} />
          权重 <input class="mini mono" type="number" step="0.05" bind:value={confirmWeight} />
        </p>
        <div class="row">
          <input class="mini" bind:value={confirmOwner} placeholder="负责人" />
          <button class="btn-primary" onclick={() => confirm()} disabled={busy}>单人确认</button>
          <button class="btn-secondary" onclick={concurrentConfirm} disabled={busy}>王磊/陈静 同时提交</button>
          <button class="btn-secondary" onclick={staleRevisionConfirm} disabled={busy}>陈静按旧修订 11 提交</button>
        </div>
      </div>

      <div class="step">
        <header><span>4</span><b>人工调整与来源变化</b></header>
        <p>先修已变（stale）时提交人工值，不允许静默覆盖来源重算结果。</p>
        <button class="btn-secondary" onclick={manualDrift} disabled={busy}>对 LM-03 提交人工值 0.55</button>
      </div>

      <div class="step">
        <header><span>5</span><b>历史数据补编号</b></header>
        <p>LM-05 长期缺外部编号，先兼容保留；W42 后补齐 <input class="mini mono" bind:value={backfillCode} /> 再接回批次。</p>
        <div class="row">
          <input class="mini mono" bind:value={backfillMapping} />
          <button class="btn-primary" onclick={backfill} disabled={busy}>补齐编号接回</button>
        </div>
      </div>

      <div class="step">
        <header><span>6</span><b>覆盖结论</b></header>
        <p>失效结论不会自动翻新，必须显式重算。</p>
        <button class="btn-primary" onclick={recompute} disabled={busy}>重算毕业要求覆盖</button>
      </div>
    </div>

    <div class="grid">
      <section class="panel">
        <div class="panel-head"><h3>外部课程目录（{catalogCourses.length}）</h3><span class="muted">编号 · 学期 · 修订号</span></div>
        <table>
          <thead><tr><th>编号</th><th>课程</th><th>修订</th><th>先修</th></tr></thead>
          <tbody>
            {#each catalogCourses as c (c.term + c.code)}
              <tr>
                <td class="mono">{c.code}</td>
                <td>{c.title}</td>
                <td class="mono">R{c.revision}</td>
                <td class="mono small">{c.prerequisites.join('、') || '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if st()!.pushReceipts && Object.keys(st()!.pushReceipts).length}
          <div class="subhead">推送收据</div>
          {#each Object.values(st()!.pushReceipts) as r (r.batchId)}
            <div class="receipt" class:dup={r.duplicated}>
              <b>{r.batchId}</b>{r.duplicated ? ' · 重复推送沿用首次结果' : ''}
              <span>先修变化：{r.prereqChanged.join('、') || '—'}；失效映射：{r.invalidatedMappings.join('、') || '—'}；待核：{r.enqueuedPending.length}</span>
            </div>
          {/each}
        {/if}
      </section>

      <section class="panel">
        <div class="panel-head"><h3>毕业要求覆盖结论</h3><span class="muted">失效需显式重算</span></div>
        <div class="coverage-list">
          {#each coverageSorted as c (c.requirementId + c.term)}
            {@const [label, cls] = coverageBadge(c)}
            <article class="coverage">
              <div class="cv-head">
                <b class="mono">{c.requirementId}</b>
                <span class={cls}>{label}</span>
              </div>
              <div class="small muted">
                支撑：{c.contributions.map((x) => `${x.courseCode}@R${x.revision}(w=${x.weight})`).join('、') || '—'}
              </div>
              {#if c.excludedLegacy.length}
                <div class="small warn-text">缺编号被排除（兼容保留）：{c.excludedLegacy.map((x) => `${x.mappingId}←${x.localCourseId}`).join('、')}</div>
              {/if}
              {#if c.unresolvedPrereqs.length}
                <div class="small warn-text">目录未解析先修：{c.unresolvedPrereqs.join('、')}</div>
              {/if}
              {#if c.invalidatedReason}<div class="small err-text">{c.invalidatedReason}</div>{/if}
            </article>
          {/each}
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-head"><h3>本地映射（{st()!.mappings.length}）</h3><span class="muted">人工值与来源值分列，漂移不互相覆盖</span></div>
      <table>
        <thead>
          <tr><th>映射</th><th>毕业要求</th><th>外部编号</th><th>本地节点</th><th>状态</th><th>基准修订</th><th>来源权重</th><th>确认/人工权重</th><th>说明</th></tr>
        </thead>
        <tbody>
          {#each st()!.mappings as m (m.id)}
            <tr>
              <td class="mono">{m.id}</td>
              <td class="mono">{m.requirementId}</td>
              <td class="mono">{m.courseCode ?? '—'}</td>
              <td class="mono small">{m.localCourseId}</td>
              <td><span class={'pill ' + statusMeta[m.status].cls}>{statusMeta[m.status].label}</span></td>
              <td class="mono">{m.baselineRevision === null ? '—' : `R${m.baselineRevision}`}</td>
              <td class="mono">{m.status === 'pending-code' ? '—' : m.sourceWeight}</td>
              <td class="mono">{m.confirmedWeight ?? (m.manual ? `人工 ${m.manual.weight}` : '—')}</td>
              <td class="small muted">{m.conflict ?? (m.manual?.note ?? '')}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>

    <div class="grid">
      <section class="panel">
        <div class="panel-head"><h3>待核队列（{pendingList.length}）</h3><span class="muted">人工漂移 / 并发落败</span></div>
        <div class="pending-list">
          {#each pendingList as p (p.id)}
            <article class="pending" class:resolved={p.resolved}>
              <div class="cv-head">
                <b>{p.kind === 'manual-drift' ? '人工值与来源漂移' : '并发确认落败'}</b>
                <span class="pill" class:st-stale={!p.resolved} class:st-confirmed={p.resolved}>{p.resolved ? `已结案 by ${p.resolvedBy}` : '待核'}</span>
              </div>
              <p class="small">{p.detail}</p>
              <small class="muted mono">{p.id} · {p.mappingId} · {p.owner} · 提议 w={p.proposedWeight} · 基准 {p.expectedRevision === null ? '—' : `R${p.expectedRevision}`}</small>
            </article>
          {:else}
            <p class="muted empty">暂无待核条目。</p>
          {/each}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head"><h3>批次检查点</h3><span class="muted">失败课程不入检查点</span></div>
        <div class="pending-list">
          {#each batches as b (b.batchId)}
            <article class="pending">
              <div class="cv-head">
                <b class="mono">{b.batchId}</b>
                <span class="pill" class:st-reconciled={b.status === 'running'} class:st-stale={b.status === 'failed'} class:st-confirmed={b.status === 'completed'}>
                  {b.status === 'running' ? '运行中' : b.status === 'failed' ? '失败' : '已完成'}
                </span>
              </div>
              <p class="small">
                计划：{b.plannedCourses.join(' → ')}<br />
                最后完成：<b class="mono">{b.lastCompletedCourse ?? '—'}</b>
                {b.failedCourse ? ` · 失败点：<b class="mono">${b.failedCourse}</b>` : ''}
              </p>
              {#if b.error}<p class="small err-text">{b.error}</p>{/if}
            </article>
          {:else}
            <p class="empty muted">尚未运行批次。</p>
          {/each}
        </div>

        <div class="panel-head" style="margin-top:10px"><h3>写入通道日志</h3></div>
        <div class="write-log">
          {#each snapshot.writerLog ?? [] as e (`${e.at}-${e.code}`)}
            <div class="small mono">{e.at.slice(11, 19)} {e.code} R{e.revision} → {e.outcome}</div>
          {:else}
            <p class="empty muted small">无写入记录。</p>
          {/each}
        </div>
      </section>
    </div>

    <section class="panel log-panel">
      <div class="panel-head"><h3>操作流水</h3></div>
      {#each logs as entry (entry.at + entry.text)}
        <div class="log-line"><span class="muted">{entry.at}</span><b class={entry.tone}>{entry.text}</b></div>
      {:else}
        <p class="muted small empty">尚无操作。</p>
      {/each}
    </section>
  {:else}
    <div class="panel"><p class="muted">正在装载对账会话…</p></div>
  {/if}
</section>

<style>
  .actions { display: flex; gap: 8px; }
  .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 12px; margin-bottom: 14px; }
  .step { padding: 13px 14px; border: 1px solid #dbe3e3; border-radius: 10px; background: #fff; }
  .step header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .step header span { display: grid; width: 21px; height: 21px; place-items: center; border-radius: 50%; background: #2f6f58; color: #fff; font-size: 11px; font-weight: 700; }
  .step p { margin: 5px 0 9px; color: #5f6e74; font-size: 11.5px; line-height: 1.55; }
  .row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 6px 0; }
  .mini { width: auto; min-width: 70px; padding: 5px 7px; font-size: 11px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 14px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { padding: 9px 10px; text-align: left; color: #74818a; font-weight: 600; font-size: 10.5px; text-transform: uppercase; border-bottom: 1px solid #e6ecec; }
  td { padding: 9px 10px; border-bottom: 1px solid #eef2f2; vertical-align: top; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; }
  .small { font-size: 11px; }
  .pill { display: inline-block; padding: 3px 8px; border-radius: 20px; font-size: 10.5px; white-space: nowrap; }
  .st-pending { color: #7a6124; background: #fbf0d4; }
  .st-stale { color: #a54431; background: #ffebe6; }
  .st-reconciled { color: #9b5a25; background: #fff0de; }
  .st-confirmed { color: #2e7359; background: #e7f4ec; }
  .receipt { margin: 0 14px 8px; padding: 8px 10px; border-radius: 8px; background: #f4f8f7; font-size: 11px; }
  .receipt.dup { background: #fbf0d4; }
  .receipt b, .receipt span { display: block; }
  .receipt span { margin-top: 3px; color: #66757b; }
  .subhead { margin: 10px 14px 6px; font-size: 11px; font-weight: 700; color: #46565c; }
  .coverage-list, .pending-list { padding: 8px 14px 14px; display: grid; gap: 9px; }
  .coverage, .pending { padding: 10px 12px; border: 1px solid #e6ecec; border-radius: 9px; background: #fafcfc; }
  .cv-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px; }
  .cv-covered { color: #2e7359; background: #e7f4ec; }
  .cv-gap { color: #7a6124; background: #fbf0d4; }
  .cv-invalid { color: #a54431; background: #ffebe6; }
  .cv-covered, .cv-gap, .cv-invalid { padding: 3px 8px; border-radius: 20px; font-size: 10.5px; }
  .warn-text { color: #9b5a25; margin-top: 4px; }
  .err-text { color: #a54431; margin-top: 4px; }
  .pending.resolved { opacity: .55; }
  .write-log { padding: 0 14px 12px; display: grid; gap: 3px; max-height: 160px; overflow: auto; }
  .log-panel { margin-bottom: 20px; }
  .log-line { display: flex; gap: 10px; padding: 6px 16px; border-bottom: 1px solid #f2f5f5; font-size: 12px; }
  .log-line b.ok { color: #2e7359; font-weight: 500; }
  .log-line b.warn { color: #9b5a25; font-weight: 500; }
  .log-line b.err { color: #a54431; font-weight: 500; }
  .empty { padding: 8px 0; }
  @media (max-width: 1050px) { .grid { grid-template-columns: 1fr; } }
</style>
