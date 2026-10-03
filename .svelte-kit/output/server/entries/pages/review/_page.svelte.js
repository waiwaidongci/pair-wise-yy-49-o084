import { h as head, c as attr, e as escape_html, b as ensure_array_like, s as store_get, a as attr_class, u as unsubscribe_stores, d as derived } from "../../../chunks/index.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils2.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
import { c as curriculumStore } from "../../../chunks/stores.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { form } = $$props;
    let selectedIds = [];
    let reviewComments = {};
    const pending = derived(() => store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).reviewItems.filter((item) => item.status === "待审阅"));
    const courseNames = derived(() => store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.filter((node) => node.type === "课程"));
    const requirements = derived(() => store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.filter((node) => node.type === "毕业要求"));
    head("1mr7uv1", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>课程改革审阅</title>`);
      });
    });
    $$renderer2.push(`<section class="page"><div class="page-head"><div><p class="eyebrow">REFORM REVIEW / 改革审阅</p><h1>修订提交与逐项审阅</h1><p class="muted">Form Actions 在服务端使用 Zod 校验；退回必须补充证据要求。</p></div> <div class="actions svelte-1mr7uv1"><button class="btn-secondary"${attr("disabled", selectedIds.length === 0, true)}>批量附议 ${escape_html(selectedIds.length ? `(${selectedIds.length})` : "")}</button><button class="btn-secondary">打印审阅单</button></div></div> `);
    if (form?.success) {
      $$renderer2.push(`<!--[0--><div class="notice success svelte-1mr7uv1">修订 ${escape_html(form.item?.id)} 已提交，进入院系审阅队列。</div>`);
    } else if (form?.errors) {
      $$renderer2.push(`<!--[1--><div class="notice error svelte-1mr7uv1">表单未通过校验：${escape_html(Object.values(form.errors).flat().join("；"))}</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="review-layout svelte-1mr7uv1"><section class="panel"><div class="panel-head"><h3>审阅队列</h3><span class="muted">${escape_html(pending().length)} 项待处理</span></div> <div class="review-list svelte-1mr7uv1"><!--[-->`);
    const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).reviewItems);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$renderer2.push(`<article${attr_class("svelte-1mr7uv1", void 0, { "selected": selectedIds.includes(item.id) })}><div class="select"><input type="checkbox"${attr("checked", selectedIds.includes(item.id), true)}/></div> <div class="review-main svelte-1mr7uv1"><div class="review-title svelte-1mr7uv1"><strong>${escape_html(item.id)} · ${escape_html(courseNames().find((node) => node.id === item.courseId)?.label.split("\n")[0])}</strong> <span${attr_class("svelte-1mr7uv1", void 0, {
        "approved": item.status === "已附议",
        "returned": item.status === "已退回"
      })}>${escape_html(item.status)}</span></div> <p class="svelte-1mr7uv1">${escape_html(item.evidence)}</p> <small class="svelte-1mr7uv1">对应 ${escape_html(requirements().find((node) => node.id === item.requirementId)?.label.split("\n")[0])} · ${escape_html(item.submitter)} 提交</small> `);
      if (item.status === "待审阅") {
        $$renderer2.push(`<!--[0--><div class="review-actions svelte-1mr7uv1"><input${attr("value", reviewComments[item.id])} placeholder="填写附议或退回意见" class="svelte-1mr7uv1"/> <button class="btn-primary">附议</button> <button class="btn-danger">退回补充</button></div>`);
      } else {
        $$renderer2.push(`<!--[-1--><div${attr_class("decision svelte-1mr7uv1", void 0, { "returned": item.status === "已退回" })}>审阅意见：${escape_html(item.comment)}</div>`);
      }
      $$renderer2.push(`<!--]--></div></article>`);
    }
    $$renderer2.push(`<!--]--></div></section> <aside class="panel"><div class="panel-head"><h3>提交课程修订</h3><span class="muted">服务端校验</span></div> <form method="POST" action="?/submitRevision" class="svelte-1mr7uv1"><label>课程<select name="courseId"><!--[-->`);
    const each_array_1 = ensure_array_like(courseNames());
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let course = each_array_1[$$index_1];
      $$renderer2.option({ value: course.id }, ($$renderer3) => {
        $$renderer3.push(`${escape_html(course.id)} · ${escape_html(course.label.split("\n")[0])}`);
      });
    }
    $$renderer2.push(`<!--]--></select></label> <label>毕业要求<select name="requirementId"><!--[-->`);
    const each_array_2 = ensure_array_like(requirements());
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let requirement = each_array_2[$$index_2];
      $$renderer2.option({ value: requirement.id }, ($$renderer3) => {
        $$renderer3.push(`${escape_html(requirement.id)} · ${escape_html(requirement.label.split("\n")[0])}`);
      });
    }
    $$renderer2.push(`<!--]--></select></label> <label>证据说明<textarea name="evidence" rows="4" placeholder="说明教学活动、考核记录与达成证据"></textarea></label> <label>修订说明<textarea name="revisionNote" rows="3" placeholder="说明本轮为什么调整映射或证据"></textarea></label> <label>提交人<input name="submitter" placeholder="课程负责人姓名"/></label> <button class="btn-primary svelte-1mr7uv1" type="submit">提交院系审阅</button></form> <div class="version-compare svelte-1mr7uv1"><strong class="svelte-1mr7uv1">R12 对比 R11</strong> <div class="svelte-1mr7uv1"><span>C-308 → GR-03</span><b class="svelte-1mr7uv1">权重 0.85 → 1.00</b></div> <div class="svelte-1mr7uv1"><span>新增考核证据</span><b class="svelte-1mr7uv1">需求追踪矩阵</b></div> <div class="svelte-1mr7uv1"><span>GR-06 覆盖</span><b class="returned svelte-1mr7uv1">证据待补充</b></div></div></aside></div></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
