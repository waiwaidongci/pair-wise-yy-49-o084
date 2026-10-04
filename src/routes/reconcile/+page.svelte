<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { browser } from '$app/environment'
  import type {
    BatchState,
    CourseReconcile,
    GraphView,
    ManualOverride,
    PushRecord,
    ReconcileState,
    ReconcileStatus,
  } from '$lib/reconcile/engine'

  type ReconcileResponse = { state: ReconcileState; graph: GraphView }

  const queryClient = useQueryClient()
  const query = createQuery<ReconcileResponse>(() => ({
    queryKey: ['reconcile'],
    enabled: browser,
    queryFn: async () => (await fetch('/api/reconcile/state')).json(),
  }))

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: ['reconcile'] })
  }

  /* ---------- 推送表单 ---------- */
  let pushForm = $state({
    courseNo: 'CS205',
    name: '数据结构与算法',
    semester: '2026-秋',
    revisionNo: 'R2',
    prerequisites: 'CS101,CS102',
  })
  let pushMessage = $state<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function submitPush() {
    const body = {
      ...pushForm,
      prerequisites: pushForm.prerequisites.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
    }
    const res = await fetch('/api/catalog/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.result === 'duplicate') {
      pushMessage = { kind: 'ok', text: `重复推送（${data.duplicateOf.key}）：已沿用第一次结果，未触发失效重算。` }
    } else if (data.ok) {
      pushMessage = { kind: 'ok', text: `已应用新修订，影响课程 ${data.affected.length ? data.affected.join('、') : '无'}，映射与覆盖结论已重算。` }
    } else {
      pushMessage = { kind: 'err', text: `推送失败：${Object.values(data.errors ?? {}).flat().join('；')}` }
    }
    await refresh()
  }

  /* ---------- 批次 ---------- */
  let failureCourse = $state('C-205')
  let batchMessage = $state<string | null>(null)

  async function startBatch() {
    const res = await fetch('/api/reconcile/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', failureCourse: failureCourse || null }),
    })
    const data = await res.json()
    batchMessage =
      data.result === 'failed'
        ? `批次在 ${data.batch.failedCourse} 写入失败，检查点已保存，可恢复续跑。`
        : '批次完成：所有课程已按最新修订重算并写入。'
    await refresh()
  }

  async function resumeBatch() {
    const res = await fetch('/api/reconcile/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    })
    const data = await res.json()
    batchMessage = data.result === 'completed' ? '批次已从检查点恢复并完成，已确认课程未重复写入。' : `批次仍失败：${data.batch?.error ?? ''}`
    await refresh()
  }

  /* ---------- 课程确认表单（按课程保存） ---------- */
  type ConfirmForm = {
    submitter: string
    note: string
    useOverride: boolean
    mappingKey: string
    weight: number
  }
  const confirmForms = $state<Record<string, ConfirmForm>>({})

  function formFor(rec: CourseReconcile): ConfirmForm {
    if (!confirmForms[rec.localCourseId]) {
      confirmForms[rec.localCourseId] = {
        submitter: '课程负责人',
        note: '',
        useOverride: false,
        mappingKey: rec.derived[0]?.key ?? '',
        weight: 0.9,
      }
    }
    return confirmForms[rec.localCourseId]
  }

  function overrideFor(rec: CourseReconcile, form: ConfirmForm): ManualOverride[] {
    if (!form.useOverride || !form.mappingKey) return []
    return [
      {
        mappingKey: form.mappingKey,
        field: 'weight',
        value: form.weight,
        reason: form.note || '负责人确认时调整权重',
        baselineRevision: rec.baselineRevision ?? '',
      },
    ]
  }

  async function confirm(rec: CourseReconcile) {
    const form = formFor(rec)
    const res = await fetch('/api/reconcile/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        localCourseId: rec.localCourseId,
        submitter: form.submitter,
        baselineRevision: rec.baselineRevision ?? '',
        baselineVersion: rec.version,
        note: form.note,
        overrides: overrideFor(rec, form),
      }),
    })
    const data = await res.json()
    await refresh()
    return data
  }

  /** 两名负责人同时提交同一课程：基准版本一致，只有一方写入，落败留作待核 */
  async function dualConfirm(rec: CourseReconcile) {
    const form = formFor(rec)
    const base = {
      localCourseId: rec.localCourseId,
      baselineRevision: rec.baselineRevision ?? '',
      baselineVersion: rec.version,
      note: form.note || '双人同时提交演示',
      overrides: overrideFor(rec, form),
    }
    const [a, b] = await Promise.all([
      fetch('/api/reconcile/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...base, submitter: `${form.submitter}甲` }),
      }).then((r) => r.json()),
      fetch('/api/reconcile/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...base, submitter: `${form.submitter}乙` }),
      }).then((r) => r.json()),
    ])
    await refresh()
    const winner = a.result === 'confirmed' ? '甲' : b.result === 'confirmed' ? '乙' : null
    const loser = winner === '甲' ? '乙' : '甲'
    pushMessage = winner
      ? { kind: 'ok', text: `双人提交：${winner} 基准一致已写入（v${rec.version}→v${rec.version + 1}），${loser} 基准不一致，内容留作待核。` }
      : { kind: 'err', text: '双人提交均未写入，已留作待核。' }
  }

  /* ---------- 补齐外部编号 ---------- */
  let linkForms = $state<Record<string, string>>({})

  async function linkCourse(rec: CourseReconcile) {
    const externalCourseNo = (linkForms[rec.localCourseId] ?? '').trim()
    if (!externalCourseNo) return
    await fetch('/api/reconcile/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localCourseId: rec.localCourseId, externalCourseNo, semester: '2026-秋' }),
    })
    await refresh()
  }

  /* ---------- 待核冲突处理 ---------- */
  async function resolve(pendingId: string, decision: 'adopt' | 'reject') {
    await fetch('/api/reconcile/conflict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pendingId, decision, note: decision === 'adopt' ? '复核后采纳落败内容。' : '复核后驳回，维持已写入内容。' }),
    })
    await refresh()
  }

  /* ---------- 展示辅助 ---------- */
  const statusMeta: Record<ReconcileStatus, { label: string; cls: string }> = {
    unlinked: { label: '缺少编号', cls: 'slate' },
    pending: { label: '待确认', cls: 'blue' },
    confirmed: { label: '已确认', cls: 'green' },
    stale: { label: '已失效', cls: 'amber' },
    conflict: { label: '待核冲突', cls: 'red' },
  }

  function mappingKeys(rec: CourseReconcile, graph: GraphView): string[] {
    const derived = rec.derived.map((d) => d.key)
    const support = graph.supports
      .filter((s) => s.source === rec.localCourseId || s.target === rec.localCourseId)
      .map((s) => `${s.source}->${s.target}:支撑`)
    return [...new Set([...derived, ...support])]
  }

  function coursePushes(pushes: PushRecord[], courseNo: string | null): PushRecord[] {
    if (!courseNo) return []
    return pushes
      .filter((p) => p.courseNo === courseNo)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
  }

  const pendingConflicts = $derived(
    query.data?.state.courses.filter((c) => c.pendingConflict?.status === '待核') ?? [],
  )
  const batch = $derived<BatchState | null>(query.data?.state.batch ?? null)
  const batchProgress = $derived(
    batch && batch.total ? Math.round((batch.completed.length / batch.total) * 100) : 0,
  )
</script>

<svelte:head><title>课程对账中心</title></svelte:head>

<section class="page">
  <div class="page-head">
    <div>
      <p class="eyebrow">RECONCILIATION / 课程对账</p>
      <h1>外部目录对账中心</h1>
      <p class="muted">推送带课程编号、学期与修订号；同一修订重复推送沿用第一次结果，先修变化立即失效重算，确认按基准版本乐观并发，批次断点续跑。</p>
    </div>
  </div>

  {#if pushMessage}
    <div class="notice {pushMessage.kind}">{pushMessage.text}</div>
  {/if}

  {#if batchMessage}
    <div class="notice ok">{batchMessage}</div>
  {/if}

  <div class="toolbar-grid">
    <section class="panel">
      <div class="panel-head"><h3>推送课程修订</h3><span class="muted">幂等 · 失效重算</span></div>
      <div class="form-grid">
        <label>课程编号<input bind:value={pushForm.courseNo} placeholder="CS205" /></label>
        <label>课程名称<input bind:value={pushForm.name} /></label>
        <label>学期<input bind:value={pushForm.semester} /></label>
        <label>修订号<input bind:value={pushForm.revisionNo} placeholder="R2" /></label>
        <label class="full">先修课程编号（逗号分隔）<input bind:value={pushForm.prerequisites} placeholder="CS101,CS102" /></label>
      </div>
      <button class="btn-primary" onclick={submitPush}>推送修订</button>
    </section>

    <section class="panel">
      <div class="panel-head"><h3>批次对账</h3><span class="muted">检查点续跑 · 已确认不重复</span></div>
      {#if batch}
        <div class="batch-status">
          <div class="batch-row"><span>批次</span><b>{batch.id}</b></div>
          <div class="batch-row"><span>状态</span><b class="status-{batch.status}">{batch.status}</b></div>
          <div class="batch-row"><span>进度</span><b>{batch.completed.length}/{batch.total}（{batchProgress}%）</b></div>
          {#if batch.failedCourse}<div class="batch-row"><span>失败课程</span><b class="returned">{batch.failedCourse}</b></div>{/if}
          {#if batch.error}<p class="batch-error">{batch.error}</p>{/if}
          <div class="progress"><div class="progress-bar" style="width: {batchProgress}%"></div></div>
        </div>
      {/if}
      <div class="batch-controls">
        <label>注入失败课程
          <select bind:value={failureCourse}>
            {#each query.data?.state.courses.filter((c) => c.externalCourseNo) ?? [] as c}
              <option value={c.localCourseId}>{c.localCourseId} · {c.courseName}</option>
            {/each}
          </select>
        </label>
        <button class="btn-secondary" onclick={startBatch}>开始批次</button>
        <button class="btn-primary" onclick={resumeBatch} disabled={batch?.status !== 'failed'}>恢复续跑</button>
      </div>
    </section>
  </div>

  {#if pendingConflicts.length}
    <section class="panel conflict-banner">
      <div class="panel-head"><h3>待核冲突</h3><span class="muted">{pendingConflicts.length} 项</span></div>
      <div class="conflict-list">
        {#each pendingConflicts as course}
          {@const pc = course.pendingConflict!}
          <article>
            <div class="conflict-title">
              <strong>{course.localCourseId} · {course.courseName}</strong>
              <span class="badge red">待核</span>
            </div>
            <p>提交人 {pc.submitter} · 基准 {pc.baselineRevision} · {pc.submittedAt.slice(11, 19)}</p>
            <p class="muted">说明：{pc.note || '（无）'}</p>
            {#if pc.overrides.length}
              <p class="muted">调整：{pc.overrides.map((o) => `${o.mappingKey} → ${o.field}=${o.value}`).join('；')}</p>
            {/if}
            <div class="review-actions">
              <button class="btn-primary" onclick={() => resolve(pc.id, 'adopt')}>采纳写入</button>
              <button class="btn-danger" onclick={() => resolve(pc.id, 'reject')}>驳回</button>
            </div>
          </article>
        {/each}
      </div>
    </section>
  {/if}

  <div class="course-list">
    {#each query.data?.state.courses ?? [] as course}
      {@const meta = statusMeta[course.status]}
      {@const form = formFor(course)}
      {@const pushes = coursePushes(query.data?.state.pushes ?? [], course.externalCourseNo)}
      <section class="panel course-card">
        <div class="course-head">
          <div>
            <div class="course-title">
              <strong>{course.localCourseId} · {course.courseName}</strong>
              <span class="badge {meta.cls}">{meta.label}</span>
              {#if course.batchCompleted}<span class="badge green">批次已完成</span>{/if}
            </div>
            <p class="muted">
              {#if course.externalCourseNo}
                外部编号 <b>{course.externalCourseNo}</b> · 学期 {course.semester} ·
                基线修订 <b>{course.baselineRevision ?? '—'}</b> ·
                确认修订 <b>{course.confirmedRevision ?? '—'}</b> ·
                版本 v{course.version}
              {:else}
                已有数据缺少外部课程编号，已先兼容保留，补齐编号后接回对账。
              {/if}
            </p>
          </div>
        </div>

        {#if !course.externalCourseNo}
          <div class="link-row">
            <input bind:value={linkForms[course.localCourseId]} placeholder="填写外部课程编号，如 CS308" />
            <button class="btn-primary" onclick={() => linkCourse(course)}>补齐编号并接回对账</button>
          </div>
        {/if}

        {#if course.externalCourseNo}
          <div class="course-grid">
            <div>
              <h4>派生映射（按最新修订）</h4>
              {#if course.derived.length}
                <ul class="edge-list">
                  {#each course.derived as d}
                    <li><span>{d.sourceCourseNo} → {d.targetCourseNo}</span><b>{d.relation}</b><small>权重 {d.weight} · {d.revisionNo}</small></li>
                  {/each}
                </ul>
              {:else}
                <p class="muted">暂无先修派生映射。</p>
              {/if}

              <h4>覆盖结论</h4>
              <ul class="coverage-list">
                {#each course.coverage as c}
                  <li>
                    <span>{c.kind} · {c.subjectName}</span>
                    <span class="badge {c.status === '覆盖' ? 'green' : 'red'}">{c.status}</span>
                    <small>{c.detail}</small>
                  </li>
                {/each}
              </ul>
            </div>

            <div>
              <h4>人工调整</h4>
              {#if course.overrides.length}
                <ul class="override-list">
                  {#each course.overrides as o}
                    <li class="active"><span>{o.mappingKey}</span><b>{o.field}={o.value}</b><small>基准 {o.baselineRevision} · 生效中</small></li>
                  {/each}
                </ul>
              {:else}
                <p class="muted">无生效中的人工调整。</p>
              {/if}
              {#if course.heldOverrides.length}
                <h4>已暂停（来源变化）</h4>
                <ul class="override-list">
                  {#each course.heldOverrides as o}
                    <li class="held"><span>{o.mappingKey}</span><b>{o.field}={o.value}</b><small>{o.holdReason}</small></li>
                  {/each}
                </ul>
              {/if}

              <h4>确认写入</h4>
              <div class="confirm-form">
                <label>提交人<input bind:value={form.submitter} /></label>
                <label>说明<input bind:value={form.note} placeholder="本轮确认说明" /></label>
                <label class="check"><input type="checkbox" bind:checked={form.useOverride} />同时调整权重</label>
                {#if form.useOverride}
                  <select bind:value={form.mappingKey}>
                    {#each mappingKeys(course, query.data?.graph ?? { courses: [], requirements: [], supports: [] }) as key}
                      <option value={key}>{key}</option>
                    {/each}
                  </select>
                  <input type="number" min="0" max="1" step="0.05" bind:value={form.weight} />
                {/if}
                <div class="confirm-actions">
                  <button class="btn-primary" onclick={() => confirm(course)} disabled={course.status === 'unlinked'}>确认写入（基准 v{course.version}）</button>
                  <button class="btn-secondary" onclick={() => dualConfirm(course)}>模拟双人同时提交</button>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </section>
    {/each}
  </div>

  <section class="panel">
    <div class="panel-head"><h3>推送台账</h3><span class="muted">同一修订重复推送沿用第一次结果</span></div>
    <div class="ledger">
      <table>
        <thead><tr><th>键</th><th>课程</th><th>学期</th><th>修订号</th><th>收到时间</th><th>结果</th></tr></thead>
        <tbody>
          {#each [...(query.data?.state.pushes ?? [])].reverse() as push}
            <tr>
              <td>{push.key}</td>
              <td>{push.snapshot.name}</td>
              <td>{push.semester}</td>
              <td>{push.revisionNo}</td>
              <td>{push.receivedAt.slice(0, 16).replace('T', ' ')}</td>
              <td>{#if push.duplicate}<span class="badge slate">重复 · 沿用第一次</span>{:else}<span class="badge green">新修订</span>{/if}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</section>

<style>
  .notice { margin-bottom: 12px; padding: 12px 14px; border-left: 3px solid #3f8869; color: #27634d; background: #ebf6f0; }
  .notice.err { border-color: #bd4d35; color: #913c2b; background: #fff1ec; }
  .toolbar-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px 16px; }
  .form-grid .full { grid-column: 1 / -1; }
  .toolbar-grid button { margin: 0 16px 16px; }
  .batch-status { padding: 14px 16px 0; }
  .batch-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #5f6e74; }
  .batch-row b { color: #25434b; }
  .batch-row b.returned { color: #a94331; }
  .status-failed { color: #a94331; }
  .status-completed { color: #2e7359; }
  .status-running { color: #9c6d25; }
  .batch-error { margin: 8px 0 0; padding: 8px 10px; color: #a54431; background: #fff0ec; font-size: 11px; }
  .progress { height: 8px; margin: 10px 0 0; border-radius: 4px; background: #eef1f1; overflow: hidden; }
  .progress-bar { height: 100%; background: #3f8c6b; transition: width .2s; }
  .batch-controls { display: flex; align-items: flex-end; gap: 8px; padding: 12px 16px 16px; }
  .batch-controls label { flex: 1; }
  .conflict-banner { margin-bottom: 14px; border-color: #e3b7a6; }
  .conflict-list { padding: 8px 16px 16px; display: grid; gap: 10px; }
  .conflict-list article { padding: 12px; border: 1px solid #f0d9cf; border-radius: 8px; background: #fdf6f3; }
  .conflict-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .conflict-title strong { font-size: 13px; }
  .conflict-list p { margin: 6px 0 0; font-size: 12px; color: #5f6e74; }
  .review-actions { display: flex; gap: 8px; margin-top: 10px; }
  .course-list { display: grid; gap: 14px; margin-bottom: 14px; }
  .course-card { padding-bottom: 14px; }
  .course-head { padding: 14px 16px 0; }
  .course-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .course-title strong { font-size: 14px; }
  .course-head p { margin: 6px 0 0; font-size: 12px; }
  .badge { padding: 3px 7px; border-radius: 5px; font-size: 10px; font-weight: 700; }
  .badge.slate { color: #5f6e74; background: #e7ecec; }
  .badge.blue { color: #2b5d7a; background: #e3f0f7; }
  .badge.green { color: #2e7359; background: #e7f4ec; }
  .badge.amber { color: #9c6d25; background: #fff0de; }
  .badge.red { color: #a94331; background: #ffebe6; }
  .link-row { display: flex; gap: 8px; padding: 14px 16px 0; }
  .link-row input { flex: 1; }
  .course-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; padding: 14px 16px 0; }
  .course-grid h4 { margin: 0 0 8px; font-size: 12px; color: #537579; }
  .course-grid h4:not(:first-child) { margin-top: 14px; }
  .edge-list, .coverage-list, .override-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .edge-list li, .coverage-list li, .override-list li { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; padding: 8px 10px; border: 1px solid #e0e6e6; border-radius: 6px; font-size: 12px; }
  .edge-list b, .override-list b { color: #2d7375; }
  .edge-list small, .coverage-list small, .override-list small { grid-column: 1 / -1; color: #839096; font-size: 10px; }
  .override-list li.active { border-color: #bfe0d2; background: #f3faf6; }
  .override-list li.held { border-color: #ecd3b8; background: #fdf7ef; }
  .override-list li.held b { color: #9c6d25; }
  .confirm-form { display: grid; gap: 8px; }
  .confirm-form .check { display: flex; align-items: center; gap: 6px; font-weight: 400; }
  .confirm-form .check input { width: auto; }
  .confirm-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .confirm-actions button { flex: 1; }
  .ledger { padding: 8px 16px 16px; overflow-x: auto; }
  .ledger table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .ledger th, .ledger td { padding: 8px 10px; border-bottom: 1px solid #edf0f0; text-align: left; }
  .ledger th { color: #738188; font-weight: 700; }
  @media (max-width: 1000px) { .toolbar-grid, .course-grid { grid-template-columns: 1fr; } }
</style>
