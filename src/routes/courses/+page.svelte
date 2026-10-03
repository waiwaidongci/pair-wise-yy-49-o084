<script lang="ts">
  import { curriculumStore } from '$lib/stores'
  let selectedCourse = $state('C-308')
  let query = $state('')
  const types = ['课程', '单元', '教学活动', '考核'] as const
  const visible = $derived($curriculumStore.nodes.filter((node) => types.includes(node.type as typeof types[number]) && `${node.label}${node.id}`.includes(query)))
  const selected = $derived(visible.find((node) => node.id === selectedCourse) ?? visible[0])
</script>

<svelte:head><title>课程、单元与考核</title></svelte:head>

<section class="page">
  <div class="page-head">
    <div><p class="eyebrow">COURSE STRUCTURE / 课程结构</p><h1>课程、单元、教学与考核</h1><p class="muted">建立纵向教学链并检查每个毕业要求是否有可验证的考核证据。</p></div>
    <button class="btn-primary">新增课程单元</button>
  </div>

  <div class="course-layout">
    <section class="panel">
      <div class="panel-head"><h3>课程图谱节点</h3><input bind:value={query} placeholder="搜索课程、单元或考核" style="max-width:240px" /></div>
      <div class="node-list">
        {#each visible as node}
          <button class:active={selected?.id === node.id} onclick={() => selectedCourse = node.id}>
            <span class={`type type-${node.type}`}>{node.type}</span>
            <strong>{node.label.split('\n')[0]}</strong>
            <small>{node.id}</small>
          </button>
        {/each}
      </div>
    </section>

    <section class="panel detail-panel">
      {#if selected}
        <div class="panel-head"><h3>{selected.label.split('\n')[0]}</h3><span class="muted">{selected.id} · {selected.type}</span></div>
        <div class="detail-body">
          <div class="form-grid">
            <label>节点名称<input value={selected.label.split('\n')[0]} /></label>
            <label>节点类型<select value={selected.type}>{#each types as type}<option>{type}</option>{/each}</select></label>
            <label>所属学期<select><option>2026 秋季</option><option>2027 春季</option></select></label>
            <label>课程负责人<input value="顾明 / 副教授" /></label>
          </div>
          <h3>直接映射</h3>
          <div class="mapping-list">
            {#each $curriculumStore.mappings.filter((mapping) => mapping.source === selected.id || mapping.target === selected.id) as mapping}
              {@const source = $curriculumStore.nodes.find((node) => node.id === mapping.source)}
              {@const target = $curriculumStore.nodes.find((node) => node.id === mapping.target)}
              <div><span>{source?.label.split('\n')[0]} → {target?.label.split('\n')[0]}</span><b>{mapping.relation}</b><small>权重 {Math.round(mapping.weight * 100)}%</small></div>
            {/each}
          </div>
          <h3>教学活动与考核证据</h3>
          <div class="evidence-grid">
            <article><strong>课前任务</strong><p>阅读需求追踪矩阵案例，完成术语卡。</p><span>形成性评价 · 10%</span></article>
            <article><strong>迭代评审演练</strong><p>小组评审需求与测试覆盖，提交问题闭环记录。</p><span>表现性评价 · 25%</span></article>
            <article><strong>需求追踪矩阵</strong><p>覆盖 12 条需求，提交双向追踪和自动化测试报告。</p><span>终结性评价 · 40%</span></article>
          </div>
        </div>
      {/if}
    </section>
  </div>
</section>

<style>
  .course-layout { display: grid; grid-template-columns: 330px minmax(0,1fr); gap: 14px; align-items: start; }
  .node-list { padding: 8px; }
  .node-list button { display: grid; width: 100%; grid-template-columns: 80px 1fr auto; align-items: center; gap: 8px; padding: 11px 10px; border: 0; border-radius: 7px; text-align: left; background: transparent; cursor: pointer; }
  .node-list button.active { background: #edf6f4; }
  .node-list strong { font-size: 12px; }
  .node-list small { color: #849096; }
  .type { padding: 3px 5px; border-radius: 4px; color: #3b6970; background: #e7eff0; text-align: center; font-size: 10px; }
  .type-课程 { color: #8b5529; background: #fff0df; }
  .detail-body { padding: 18px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .detail-body h3 { margin: 24px 0 10px; font-size: 14px; }
  .mapping-list { display: grid; gap: 7px; }
  .mapping-list div { display: grid; grid-template-columns: 1fr 80px 100px; gap: 10px; padding: 10px; border: 1px solid #e0e6e6; border-radius: 7px; font-size: 12px; }
  .mapping-list b { color: #2d7375; }
  .mapping-list small { color: #79868c; }
  .evidence-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
  .evidence-grid article { padding: 12px; border-top: 3px solid #377d7a; background: #f6f8f7; }
  .evidence-grid p { margin: 6px 0 9px; color: #66757b; font-size: 11px; line-height: 1.55; }
  .evidence-grid span { color: #946436; font-size: 10px; font-weight: 700; }
  @media (max-width: 1000px) { .course-layout { grid-template-columns: 1fr; } .evidence-grid { grid-template-columns: 1fr; } }
</style>
