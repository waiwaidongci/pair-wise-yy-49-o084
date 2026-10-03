<script lang="ts">
  import { curriculumStore, validateCurriculum } from '$lib/stores'
  import type { Mapping } from '$lib/seed'

  let dragging = $state<string | null>(null)
  let offset = $state({ x: 0, y: 0 })
  let selectedNode = $state('C-308')
  let source = $state('GR-03')
  let target = $state('C-308')
  let relation = $state<Mapping['relation']>('支撑')
  let weight = $state(1)
  let query = $state('')
  const issues = $derived(validateCurriculum($curriculumStore))
  const visibleIds = $derived(new Set($curriculumStore.nodes.filter((node) => !query || node.label.includes(query) || node.id.includes(query)).map((node) => node.id)))
  const selected = $derived($curriculumStore.nodes.find((item) => item.id === selectedNode))

  function startDrag(event: MouseEvent, id: string) {
    const node = $curriculumStore.nodes.find((item) => item.id === id)
    if (!node) return
    const svg = (event.currentTarget as SVGElement).ownerSVGElement
    const rect = svg?.getBoundingClientRect()
    if (!rect) return
    dragging = id
    offset = { x: ((event.clientX - rect.left) / rect.width) * 1200 - node.x, y: ((event.clientY - rect.top) / rect.height) * 520 - node.y }
  }

  function drag(event: MouseEvent) {
    if (!dragging) return
    const svg = event.currentTarget as SVGSVGElement
    const rect = svg.getBoundingClientRect()
    curriculumStore.moveNode(dragging, Math.max(50, Math.min(1140, ((event.clientX - rect.left) / rect.width) * 1200 - offset.x)), Math.max(30, Math.min(480, ((event.clientY - rect.top) / rect.height) * 520 - offset.y)))
  }

  function addMapping() {
    if (source === target) return
    curriculumStore.addMapping(source, target, relation, weight)
  }

  function exportMap() {
    const blob = new Blob([JSON.stringify($curriculumStore, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `课程地图-${$curriculumStore.revision}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
</script>

<svelte:head><title>映射图谱与覆盖矩阵</title></svelte:head>

<section class="page">
  <div class="page-head">
    <div><p class="eyebrow">CURRICULUM MAP / 映射图谱</p><h1>有向关系与覆盖矩阵</h1><p class="muted">拖动节点重新布局；连边关系持久保存，覆盖缺口会立即高亮。</p></div>
    <div class="actions"><button class="btn-secondary" onclick={exportMap}>导出课程地图</button><button class="btn-primary" onclick={() => $curriculumStore.lock(`R${Number($curriculumStore.revision.slice(1)) + 1}`)}>锁定当前版本</button></div>
  </div>

  <div class="matrix-toolbar panel">
    <input bind:value={query} placeholder="搜索目标、课程或单元" />
    <select bind:value={source}>{#each $curriculumStore.nodes as node}<option value={node.id}>{node.id} · {node.label.split('\n')[0]}</option>{/each}</select>
    <span>→</span>
    <select bind:value={target}>{#each $curriculumStore.nodes as node}<option value={node.id}>{node.id} · {node.label.split('\n')[0]}</option>{/each}</select>
    <select bind:value={relation}><option>支撑</option><option>前置</option><option>教学</option><option>考核</option></select>
    <input bind:value={weight} type="number" min="0" max="1" step="0.1" />
    <button class="btn-primary" onclick={addMapping}>新增连边</button>
    <span class="muted">{issues.length} 项校验提示</span>
  </div>

  <div class="matrix-layout">
    <section class="panel graph-panel">
      <div class="panel-head"><h3>课程改革有向图</h3><span class="muted">拖拽节点重排 · 点击查看详情</span></div>
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <svg role="application" aria-label="课程映射拖拽图" viewBox="0 0 1200 520" onmousemove={drag} onmouseup={() => (dragging = null)} onmouseleave={() => (dragging = null)}>
        <defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#688086" /></marker></defs>
        {#each $curriculumStore.mappings as mapping}
          {@const from = $curriculumStore.nodes.find((node) => node.id === mapping.source)}
          {@const to = $curriculumStore.nodes.find((node) => node.id === mapping.target)}
          {#if from && to && visibleIds.has(from.id) && visibleIds.has(to.id)}
            <line x1={from.x + 80} y1={from.y + 28} x2={to.x} y2={to.y + 28} class:relation={true} marker-end="url(#arrow)" />
            <text x={(from.x + to.x) / 2 + 80} y={(from.y + to.y) / 2 + 22} class="edge-label">{mapping.relation}</text>
          {/if}
        {/each}
        {#each $curriculumStore.nodes as node}
          {#if visibleIds.has(node.id)}
            <g
              class:selected={selectedNode === node.id}
              class:coverage-gap={issues.some((issue) => issue.id === `coverage-${node.id}`)}
              onmousedown={(event) => startDrag(event, node.id)}
              onclick={() => (selectedNode = node.id)}
              onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') selectedNode = node.id }}
              role="button"
              tabindex="0"
            >
              <rect x={node.x} y={node.y} width="160" height="58" rx="9" class={`node node-${node.type}`} />
              <text x={node.x + 80} y={node.y + 24} text-anchor="middle" class="node-label">{node.label.split('\n')[0]}</text>
              <text x={node.x + 80} y={node.y + 42} text-anchor="middle" class="node-id">{node.id} · {node.type}</text>
            </g>
          {/if}
        {/each}
      </svg>
    </section>

    <aside class="panel">
      <div class="panel-head"><h3>覆盖矩阵</h3><span class="muted">Σ 权重</span></div>
      <div class="coverage-matrix">
        {#each $curriculumStore.nodes.filter((node) => node.type === '毕业要求') as requirement}
          <div class="matrix-row">
            <strong>{requirement.label.split('\n')[0]}</strong>
            {#each $curriculumStore.nodes.filter((node) => node.type === '课程') as course}
              {@const links = $curriculumStore.mappings.filter((mapping) => mapping.source === requirement.id && mapping.target === course.id)}
              <span class:covered={links.length}>{links.length ? Math.round(links.reduce((sum, link) => sum + link.weight, 0) * 100) : '—'}</span>
            {/each}
          </div>
        {/each}
      </div>
      <div class="legend"><span><i class="covered-dot"></i>已有映射</span><span><i class="gap-dot"></i>覆盖缺口</span></div>
      <div class="node-detail">
        {#if selected}
          <strong>{selected.label.split('\n')[0]}</strong><p>{selected.id} · {selected.type}</p><button class="btn-secondary">编辑节点信息</button>
        {/if}
      </div>
    </aside>
  </div>
</section>

<style>
  .actions { display: flex; gap: 8px; }
  .matrix-toolbar { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; margin-bottom: 12px; padding: 12px; }
  .matrix-toolbar > input:first-child { max-width: 220px; }
  .matrix-toolbar select { max-width: 230px; }
  .matrix-layout { display: grid; grid-template-columns: minmax(0,1fr) 360px; gap: 14px; align-items: start; }
  svg { display: block; width: 100%; min-width: 900px; background: radial-gradient(circle,#dce2e2 1px,transparent 1px); background-size: 22px 22px; }
  .graph-panel { overflow: auto; }
  line { stroke: #688086; stroke-width: 1.8; opacity: .65; }
  .edge-label { fill: #60757b; font-size: 9px; }
  g { cursor: grab; }
  g.selected .node { stroke-width: 3; }
  g.coverage-gap .node { stroke: #c14932; stroke-dasharray: 7 4; }
  .node { fill: white; stroke: #3c7c7d; stroke-width: 1.5; }
  .node-目标 { fill: #edf7f4; stroke: #3d7e70; }
  .node-课程 { fill: #fff5e9; stroke: #bd7437; }
  .node-毕业要求 { fill: #edf3f6; stroke: #50758a; }
  .node-单元 { fill: #f5f1f8; stroke: #806a9d; }
  .node-label { fill: #263b42; font-size: 12px; font-weight: 700; pointer-events: none; }
  .node-id { fill: #75848a; font-size: 9px; pointer-events: none; }
  .coverage-matrix { padding: 14px; overflow-x: auto; }
  .matrix-row { display: grid; grid-template-columns: 110px repeat(3,50px); gap: 6px; align-items: center; min-width: 310px; margin-bottom: 8px; }
  .matrix-row strong { font-size: 11px; }
  .matrix-row span { display: grid; height: 32px; place-items: center; border-radius: 5px; color: #8b969b; background: #f1f3f3; font-size: 11px; }
  .matrix-row span.covered { color: #276a55; background: #e4f3eb; font-weight: 800; }
  .legend { display: flex; gap: 14px; padding: 0 14px 14px; color: #6e7c82; font-size: 10px; }
  .legend i { display: inline-block; width: 8px; height: 8px; margin-right: 4px; border-radius: 50%; }
  .covered-dot { background: #3f8c6b; }
  .gap-dot { background: #c14932; }
  .node-detail { margin: 0 14px 14px; padding: 13px; border-left: 3px solid #377c7b; background: #f3f7f6; }
  .node-detail strong { display: block; }
  .node-detail p { margin: 5px 0 10px; color: #748188; font-size: 11px; }
  @media (max-width: 1050px) { .matrix-layout { grid-template-columns: 1fr; } }
</style>
