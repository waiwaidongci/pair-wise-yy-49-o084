import { h as head, c as attr, b as ensure_array_like, s as store_get, e as escape_html, a as attr_class, u as unsubscribe_stores, d as derived } from "../../../chunks/index.js";
import { c as curriculumStore, v as validateCurriculum } from "../../../chunks/stores.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let selectedNode = "C-308";
    let source = "GR-03";
    let target = "C-308";
    let relation = "支撑";
    let weight = 1;
    let query = "";
    const issues = derived(() => validateCurriculum(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore)));
    const visibleIds = derived(() => new Set(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.filter((node) => !query).map((node) => node.id)));
    const selected = derived(() => store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.find((item) => item.id === selectedNode));
    head("lqcok6", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>映射图谱与覆盖矩阵</title>`);
      });
    });
    $$renderer2.push(`<section class="page"><div class="page-head"><div><p class="eyebrow">CURRICULUM MAP / 映射图谱</p><h1>有向关系与覆盖矩阵</h1><p class="muted">拖动节点重新布局；连边关系持久保存，覆盖缺口会立即高亮。</p></div> <div class="actions svelte-lqcok6"><button class="btn-secondary">导出课程地图</button><button class="btn-primary">锁定当前版本</button></div></div> <div class="matrix-toolbar panel svelte-lqcok6"><input${attr("value", query)} placeholder="搜索目标、课程或单元" class="svelte-lqcok6"/> `);
    $$renderer2.select(
      { value: source, class: "" },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let node = each_array[$$index];
          $$renderer3.option({ value: node.id }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(node.id)} · ${escape_html(node.label.split("\n")[0])}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-lqcok6"
    );
    $$renderer2.push(` <span>→</span> `);
    $$renderer2.select(
      { value: target, class: "" },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array_1 = ensure_array_like(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let node = each_array_1[$$index_1];
          $$renderer3.option({ value: node.id }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(node.id)} · ${escape_html(node.label.split("\n")[0])}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-lqcok6"
    );
    $$renderer2.push(` `);
    $$renderer2.select(
      { value: relation, class: "" },
      ($$renderer3) => {
        $$renderer3.option({}, ($$renderer4) => {
          $$renderer4.push(`支撑`);
        });
        $$renderer3.option({}, ($$renderer4) => {
          $$renderer4.push(`前置`);
        });
        $$renderer3.option({}, ($$renderer4) => {
          $$renderer4.push(`教学`);
        });
        $$renderer3.option({}, ($$renderer4) => {
          $$renderer4.push(`考核`);
        });
      },
      "svelte-lqcok6"
    );
    $$renderer2.push(` <input${attr("value", weight)} type="number" min="0" max="1" step="0.1" class="svelte-lqcok6"/> <button class="btn-primary">新增连边</button> <span class="muted">${escape_html(issues().length)} 项校验提示</span></div> <div class="matrix-layout svelte-lqcok6"><section class="panel graph-panel svelte-lqcok6"><div class="panel-head"><h3>课程改革有向图</h3><span class="muted">拖拽节点重排 · 点击查看详情</span></div> <svg role="application" aria-label="课程映射拖拽图" viewBox="0 0 1200 520" class="svelte-lqcok6"><defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#688086"></path></marker></defs><!--[-->`);
    const each_array_2 = ensure_array_like(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).mappings);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let mapping = each_array_2[$$index_2];
      const from = store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.find((node) => node.id === mapping.source);
      const to = store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.find((node) => node.id === mapping.target);
      if (from && to && visibleIds().has(from.id) && visibleIds().has(to.id)) {
        $$renderer2.push(`<!--[0--><line${attr("x1", from.x + 80)}${attr("y1", from.y + 28)}${attr("x2", to.x)}${attr("y2", to.y + 28)} marker-end="url(#arrow)"${attr_class("svelte-lqcok6", void 0, { "relation": true })}></line><text${attr("x", (from.x + to.x) / 2 + 80)}${attr("y", (from.y + to.y) / 2 + 22)} class="edge-label svelte-lqcok6">${escape_html(mapping.relation)}</text>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--><!--[-->`);
    const each_array_3 = ensure_array_like(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes);
    for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
      let node = each_array_3[$$index_3];
      if (visibleIds().has(node.id)) {
        $$renderer2.push(`<!--[0--><g role="button" tabindex="0"${attr_class("svelte-lqcok6", void 0, {
          "selected": selectedNode === node.id,
          "coverage-gap": issues().some((issue) => issue.id === `coverage-${node.id}`)
        })}><rect${attr("x", node.x)}${attr("y", node.y)} width="160" height="58" rx="9"${attr_class(`node node-${node.type}`, "svelte-lqcok6")}></rect><text${attr("x", node.x + 80)}${attr("y", node.y + 24)} text-anchor="middle" class="node-label svelte-lqcok6">${escape_html(node.label.split("\n")[0])}</text><text${attr("x", node.x + 80)}${attr("y", node.y + 42)} text-anchor="middle" class="node-id svelte-lqcok6">${escape_html(node.id)} · ${escape_html(node.type)}</text></g>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></svg></section> <aside class="panel"><div class="panel-head"><h3>覆盖矩阵</h3><span class="muted">Σ 权重</span></div> <div class="coverage-matrix svelte-lqcok6"><!--[-->`);
    const each_array_4 = ensure_array_like(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.filter((node) => node.type === "毕业要求"));
    for (let $$index_5 = 0, $$length = each_array_4.length; $$index_5 < $$length; $$index_5++) {
      let requirement = each_array_4[$$index_5];
      $$renderer2.push(`<div class="matrix-row svelte-lqcok6"><strong class="svelte-lqcok6">${escape_html(requirement.label.split("\n")[0])}</strong> <!--[-->`);
      const each_array_5 = ensure_array_like(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.filter((node) => node.type === "课程"));
      for (let $$index_4 = 0, $$length2 = each_array_5.length; $$index_4 < $$length2; $$index_4++) {
        let course = each_array_5[$$index_4];
        const links = store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).mappings.filter((mapping) => mapping.source === requirement.id && mapping.target === course.id);
        $$renderer2.push(`<span${attr_class("svelte-lqcok6", void 0, { "covered": links.length })}>${escape_html(links.length ? Math.round(links.reduce((sum, link) => sum + link.weight, 0) * 100) : "—")}</span>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="legend svelte-lqcok6"><span><i class="covered-dot svelte-lqcok6"></i>已有映射</span><span><i class="gap-dot svelte-lqcok6"></i>覆盖缺口</span></div> <div class="node-detail svelte-lqcok6">`);
    if (selected()) {
      $$renderer2.push(`<!--[0--><strong class="svelte-lqcok6">${escape_html(selected().label.split("\n")[0])}</strong><p class="svelte-lqcok6">${escape_html(selected().id)} · ${escape_html(selected().type)}</p><button class="btn-secondary">编辑节点信息</button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></aside></div></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
