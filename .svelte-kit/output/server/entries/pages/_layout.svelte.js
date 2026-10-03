import { h as head, e as escape_html, a as attr_class, b as ensure_array_like, c as attr, s as store_get, u as unsubscribe_stores } from "../../chunks/index.js";
import { p as page } from "../../chunks/index2.js";
import { c as curriculumStore } from "../../chunks/stores.js";
import "clsx";
import { s as setQueryClientContext, o as onDestroy } from "../../chunks/context.js";
import { QueryClient } from "@tanstack/query-core";
function QueryClientProvider($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const { client = new QueryClient(), children } = $$props;
    setQueryClientContext(client);
    onDestroy(() => {
      client.unmount();
    });
    children($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 3e4, retry: 1 } } });
    let { children } = $$props;
    let mobileOpen = false;
    const nav = [
      { href: "/", label: "建设总览", icon: "总" },
      { href: "/courses", label: "课程与单元", icon: "课" },
      { href: "/matrix", label: "映射图谱", icon: "图" },
      { href: "/review", label: "改革审阅", icon: "审" }
    ];
    head("12qhfyh", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(page.data?.title ?? "课程改革审阅平台")}</title>`);
      });
    });
    QueryClientProvider($$renderer2, {
      client: queryClient,
      children: ($$renderer3) => {
        $$renderer3.push(`<div class="shell svelte-12qhfyh"><aside${attr_class("svelte-12qhfyh", void 0, { "open": mobileOpen })}><div class="brand svelte-12qhfyh"><div class="brand-mark svelte-12qhfyh">课改</div><div><strong class="svelte-12qhfyh">课程标准映射</strong><small class="svelte-12qhfyh">计算机科学与技术专业</small></div></div> <nav class="svelte-12qhfyh"><!--[-->`);
        const each_array = ensure_array_like(nav);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let item = each_array[$$index];
          $$renderer3.push(`<a${attr("href", item.href)}${attr_class("svelte-12qhfyh", void 0, { "active": page.url.pathname === item.href })}><span class="svelte-12qhfyh">${escape_html(item.icon)}</span>${escape_html(item.label)}</a>`);
        }
        $$renderer3.push(`<!--]--></nav> <div class="side-note svelte-12qhfyh"><strong class="svelte-12qhfyh">${escape_html(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).locked ? "版本已锁定" : "草稿自动保存")}</strong><span class="svelte-12qhfyh">当前版本 ${escape_html(store_get($$store_subs ??= {}, "$curriculumStore", curriculumStore).revision)}</span></div></aside> <main class="svelte-12qhfyh"><header class="mobile-header svelte-12qhfyh"><button class="svelte-12qhfyh">菜单</button><strong>${escape_html(page.data?.title ?? "课程标准映射")}</strong></header> `);
        children($$renderer3);
        $$renderer3.push(`<!----></main></div>`);
      }
    });
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
