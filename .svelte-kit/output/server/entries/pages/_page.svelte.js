import { d as derived, h as head, e as escape_html, s as store_get, b as ensure_array_like, a as attr_class, u as unsubscribe_stores, D as DEV } from "../../chunks/index.js";
import { c as curriculumStore, v as validateCurriculum } from "../../chunks/stores.js";
import { QueryObserver } from "@tanstack/query-core";
import { g as getIsRestoringContext, a as getQueryClientContext, o as onDestroy } from "../../chunks/context.js";
import "clsx";
function useIsRestoring() {
  return getIsRestoringContext();
}
function useQueryClient(queryClient) {
  return getQueryClientContext();
}
const SvelteSet = globalThis.Set;
(function(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
});
(function(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
});
function createRawRef(init) {
  const refObj = Array.isArray(init) ? [] : {};
  const hiddenKeys = new SvelteSet();
  const out = new Proxy(refObj, {
    get(target, prop, receiver) {
      if (hiddenKeys.has(prop) || !(prop in target) || Array.isArray(target) && prop === "length") ;
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      hiddenKeys.delete(prop);
      if (prop in target) {
        return Reflect.set(target, prop, value, receiver);
      }
      let state = value;
      Object.defineProperty(target, prop, {
        configurable: true,
        enumerable: true,
        get: () => {
          return state && isBranded(state) ? state() : state;
        },
        set: (v) => {
          state = v;
        }
      });
      return true;
    },
    has: (target, prop) => {
      if (hiddenKeys.has(prop)) {
        return false;
      }
      return prop in target;
    },
    ownKeys(target) {
      return Reflect.ownKeys(target).filter((key) => !hiddenKeys.has(key));
    },
    getOwnPropertyDescriptor(target, prop) {
      if (hiddenKeys.has(prop)) {
        return void 0;
      }
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    deleteProperty(target, prop) {
      if (prop in target) {
        target[prop] = void 0;
        hiddenKeys.add(prop);
        if (Array.isArray(target)) {
          target.length--;
        }
        return true;
      }
      return false;
    }
  });
  function update(newValue) {
    const existingKeys = Object.keys(out);
    const newKeys = Object.keys(newValue);
    const keysToRemove = existingKeys.filter((key) => !newKeys.includes(key));
    if (Array.isArray(newValue)) {
      keysToRemove.sort((a, b) => Number(b) - Number(a));
    }
    const keysAdded = newKeys.some((key) => !existingKeys.includes(key));
    for (const key of keysToRemove) {
      delete out[key];
    }
    for (const key of newKeys) {
      out[key] = brand(() => newValue[key]);
    }
    if (keysAdded || keysToRemove.length > 0) ;
  }
  update(init);
  return [out, update];
}
const lazyBrand = /* @__PURE__ */ Symbol("LazyValue");
function brand(fn) {
  fn[lazyBrand] = true;
  return fn;
}
function isBranded(fn) {
  return Boolean(fn[lazyBrand]);
}
function createBaseQuery(options, Observer, queryClient) {
  const client = derived(() => useQueryClient());
  const isRestoring = useIsRestoring();
  const resolvedOptions = derived(() => {
    const opts = client().defaultQueryOptions(options());
    opts._optimisticResults = isRestoring.current ? "isRestoring" : "optimistic";
    return opts;
  });
  let observer = new Observer(client(), resolvedOptions());
  function createResult() {
    const result = observer.getOptimisticResult(resolvedOptions());
    return !resolvedOptions().notifyOnChangeProps ? observer.trackResult(result) : result;
  }
  const [query, update] = createRawRef(
    // svelte-ignore state_referenced_locally - intentional, initial value
    createResult()
  );
  let unsubscribe = isRestoring.current && typeof window !== "undefined" ? () => void 0 : observer.subscribe(() => update(createResult()));
  try {
    onDestroy(() => {
      unsubscribe();
    });
  } catch (e) {
  }
  return query;
}
function createQuery(options, queryClient) {
  return createBaseQuery(options, QueryObserver);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const query = createQuery(() => ({
      queryKey: ["curriculum"],
      enabled: DEV,
      queryFn: async () => {
        const response = await fetch("/api/curriculum");
        return response.json();
      }
    }));
    const issues = derived(() => validateCurriculum(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore)));
    const reviewOpen = derived(() => store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).reviewItems.filter((item) => item.status === "待审阅").length);
    const covered = derived(() => store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.filter((node) => node.type === "毕业要求" && store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).mappings.some((mapping) => mapping.source === node.id)).length);
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>课程标准映射总览</title>`);
      });
    });
    $$renderer2.push(`<section class="page"><div class="page-head"><div><p class="eyebrow">CURRICULUM REFORM / 课程改革</p><h1>专业课程图谱总览</h1><p class="muted">从培养目标到考核证据的完整映射，当前数据由 SvelteKit API 与 TanStack Query 提供。</p></div> <div class="actions svelte-1uha8ag"><a class="btn-secondary svelte-1uha8ag" href="/matrix">查看图谱</a><a class="btn-primary svelte-1uha8ag" href="/review">处理审阅</a></div></div> <div class="metric-grid"><article class="metric"><span>培养目标</span><strong>${escape_html(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.filter((node) => node.type === "目标").length)}</strong><small>2 条毕业要求主链</small></article> <article class="metric"><span>毕业要求覆盖</span><strong>${escape_html(covered())}/${escape_html(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.filter((node) => node.type === "毕业要求").length)}</strong><small>${escape_html(issues().filter((issue) => issue.severity === "错误").length)} 个阻断缺口</small></article> <article class="metric"><span>课程映射</span><strong>${escape_html(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).mappings.length)}</strong><small>含前置、教学与考核</small></article> <article class="metric"><span>待审阅提交</span><strong style="color:#b45c34">${escape_html(reviewOpen())}</strong><small>院系审阅队列</small></article></div> <div class="overview-grid svelte-1uha8ag"><section class="panel"><div class="panel-head"><h3>培养目标达成链</h3>`);
    if (query.data) {
      $$renderer2.push(`<!--[0--><span class="muted">数据更新 ${escape_html(query.data.updatedAt.slice(11, 16))}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="chain svelte-1uha8ag"><!--[-->`);
    const each_array = ensure_array_like(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.filter((node) => node.type === "目标"));
    for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
      let objective = each_array[$$index_1];
      $$renderer2.push(`<article class="svelte-1uha8ag"><div class="node-title svelte-1uha8ag">${escape_html(objective.label.split("\n")[0])}</div> <p class="svelte-1uha8ag">${escape_html(objective.label.split("\n")[1])}</p> <div class="arrow svelte-1uha8ag">↓</div> <div class="requirements svelte-1uha8ag"><!--[-->`);
      const each_array_1 = ensure_array_like(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).mappings.filter((mapping) => mapping.source === objective.id));
      for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
        let mapping = each_array_1[$$index];
        const requirement = store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).nodes.find((node) => node.id === mapping.target);
        $$renderer2.push(`<div class="svelte-1uha8ag">${escape_html(requirement?.label.split("\n")[0])} <span class="svelte-1uha8ag">权重 ${escape_html(Math.round(mapping.weight * 100))}%</span></div>`);
      }
      $$renderer2.push(`<!--]--></div></article>`);
    }
    $$renderer2.push(`<!--]--></div></section> <aside class="panel"><div class="panel-head"><h3>结构校验</h3><span class="muted">${escape_html(issues().length)} 项提示</span></div> <div class="issue-list svelte-1uha8ag"><!--[-->`);
    const each_array_2 = ensure_array_like(issues());
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let issue = each_array_2[$$index_2];
      $$renderer2.push(`<article${attr_class("svelte-1uha8ag", void 0, { "error": issue.severity === "错误" })}><strong class="svelte-1uha8ag">${escape_html(issue.title)}</strong><p class="svelte-1uha8ag">${escape_html(issue.detail)}</p><span class="svelte-1uha8ag">${escape_html(issue.severity)}</span></article>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (issues().length === 0) {
      $$renderer2.push(`<!--[0--><div class="empty svelte-1uha8ag">未发现覆盖缺口或重复映射。</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="hint-box svelte-1uha8ag"><strong class="svelte-1uha8ag">当前草稿</strong><p class="svelte-1uha8ag">${escape_html(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).draft)}</p></div></aside></div></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
