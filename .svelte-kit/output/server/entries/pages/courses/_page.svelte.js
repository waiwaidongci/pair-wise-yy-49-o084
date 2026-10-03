import { h as head, c as attr, b as ensure_array_like, a as attr_class, e as escape_html, s as store_get, u as unsubscribe_stores, d as derived } from "../../../chunks/index.js";
import { c as curriculumStore } from "../../../chunks/stores.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let selectedCourse = "C-308";
    let query = "";
    const types = ["课程", "单元", "教学活动", "考核"];
    const visible = derived(() => store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.filter((node) => types.includes(node.type) && `${node.label}${node.id}`.includes(query)));
    const selected = derived(() => visible().find((node) => node.id === selectedCourse) ?? visible()[0]);
    head("zuqxs5", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>课程、单元与考核</title>`);
      });
    });
    $$renderer2.push(`<section class="page"><div class="page-head"><div><p class="eyebrow">COURSE STRUCTURE / 课程结构</p><h1>课程、单元、教学与考核</h1><p class="muted">建立纵向教学链并检查每个毕业要求是否有可验证的考核证据。</p></div> <button class="btn-primary">新增课程单元</button></div> <div class="course-layout svelte-zuqxs5"><section class="panel"><div class="panel-head"><h3>课程图谱节点</h3><input${attr("value", query)} placeholder="搜索课程、单元或考核" style="max-width:240px"/></div> <div class="node-list svelte-zuqxs5"><!--[-->`);
    const each_array = ensure_array_like(visible());
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let node = each_array[$$index];
      $$renderer2.push(`<button${attr_class("svelte-zuqxs5", void 0, { "active": selected()?.id === node.id })}><span${attr_class(`type type-${node.type}`, "svelte-zuqxs5")}>${escape_html(node.type)}</span> <strong class="svelte-zuqxs5">${escape_html(node.label.split("\n")[0])}</strong> <small class="svelte-zuqxs5">${escape_html(node.id)}</small></button>`);
    }
    $$renderer2.push(`<!--]--></div></section> <section class="panel detail-panel">`);
    if (selected()) {
      $$renderer2.push(`<!--[0--><div class="panel-head"><h3>${escape_html(selected().label.split("\n")[0])}</h3><span class="muted">${escape_html(selected().id)} · ${escape_html(selected().type)}</span></div> <div class="detail-body svelte-zuqxs5"><div class="form-grid svelte-zuqxs5"><label>节点名称<input${attr("value", selected().label.split("\n")[0])}/></label> <label>节点类型`);
      $$renderer2.select({ value: selected().type }, ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array_1 = ensure_array_like(types);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let type = each_array_1[$$index_1];
          $$renderer3.option({}, type);
        }
        $$renderer3.push(`<!--]-->`);
      });
      $$renderer2.push(`</label> <label>所属学期<select>`);
      $$renderer2.option({}, ($$renderer3) => {
        $$renderer3.push(`2026 秋季`);
      });
      $$renderer2.option({}, ($$renderer3) => {
        $$renderer3.push(`2027 春季`);
      });
      $$renderer2.push(`</select></label> <label>课程负责人<input value="顾明 / 副教授"/></label></div> <h3 class="svelte-zuqxs5">直接映射</h3> <div class="mapping-list svelte-zuqxs5"><!--[-->`);
      const each_array_2 = ensure_array_like(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).mappings.filter((mapping) => mapping.source === selected().id || mapping.target === selected().id));
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let mapping = each_array_2[$$index_2];
        const source = store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.find((node) => node.id === mapping.source);
        const target = store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.find((node) => node.id === mapping.target);
        $$renderer2.push(`<div class="svelte-zuqxs5"><span>${escape_html(source?.label.split("\n")[0])} → ${escape_html(target?.label.split("\n")[0])}</span><b class="svelte-zuqxs5">${escape_html(mapping.relation)}</b><small class="svelte-zuqxs5">权重 ${escape_html(Math.round(mapping.weight * 100))}%</small></div>`);
      }
      $$renderer2.push(`<!--]--></div> <h3 class="svelte-zuqxs5">教学活动与考核证据</h3> <div class="evidence-grid svelte-zuqxs5"><article class="svelte-zuqxs5"><strong>课前任务</strong><p class="svelte-zuqxs5">阅读需求追踪矩阵案例，完成术语卡。</p><span class="svelte-zuqxs5">形成性评价 · 10%</span></article> <article class="svelte-zuqxs5"><strong>迭代评审演练</strong><p class="svelte-zuqxs5">小组评审需求与测试覆盖，提交问题闭环记录。</p><span class="svelte-zuqxs5">表现性评价 · 25%</span></article> <article class="svelte-zuqxs5"><strong>需求追踪矩阵</strong><p class="svelte-zuqxs5">覆盖 12 条需求，提交双向追踪和自动化测试报告。</p><span class="svelte-zuqxs5">终结性评价 · 40%</span></article></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></section></div></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
