<script lang="ts">
  import { page } from '$app/state'
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { curriculumStore } from '$lib/stores'
  import '../app.css'
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  })
  let { children } = $props()
  let mobileOpen = $state(false)
  const nav = [
    { href: '/', label: '建设总览', icon: '总' },
    { href: '/courses', label: '课程与单元', icon: '课' },
    { href: '/matrix', label: '映射图谱', icon: '图' },
    { href: '/review', label: '改革审阅', icon: '审' },
    { href: '/reconcile', label: '课程对账', icon: '账' },
  ]
</script>

<svelte:head><title>{page.data?.title ?? '课程改革审阅平台'}</title></svelte:head>

<QueryClientProvider client={queryClient}>
  <div class="shell">
    <aside class:open={mobileOpen}>
      <div class="brand"><div class="brand-mark">课改</div><div><strong>课程标准映射</strong><small>计算机科学与技术专业</small></div></div>
      <nav>
        {#each nav as item}
          <a href={item.href} class:active={page.url.pathname === item.href} onclick={() => mobileOpen = false}><span>{item.icon}</span>{item.label}</a>
        {/each}
      </nav>
      <div class="side-note"><strong>{$curriculumStore.locked ? '版本已锁定' : '草稿自动保存'}</strong><span>当前版本 {$curriculumStore.revision}</span></div>
    </aside>
    <main>
      <header class="mobile-header"><button onclick={() => mobileOpen = !mobileOpen}>菜单</button><strong>{page.data?.title ?? '课程标准映射'}</strong></header>
      {@render children()}
    </main>
  </div>
</QueryClientProvider>

<style>
  .shell { min-height: 100vh; background: #f1f4f3; }
  aside { position: fixed; inset: 0 auto 0 0; z-index: 20; display: flex; width: 242px; flex-direction: column; color: #e8f0f1; background: #264a52; }
  .brand { display: flex; align-items: center; gap: 11px; padding: 20px 16px; border-bottom: 1px solid rgba(255,255,255,.1); }
  .brand-mark { display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid #79b0ac; border-radius: 9px; color: #b5e1dc; font-size: 13px; font-weight: 800; }
  .brand strong, .brand small { display: block; }
  .brand strong { font-size: 14px; }
  .brand small { margin-top: 4px; color: #9bb1b4; font-size: 10px; }
  nav { display: grid; gap: 5px; padding: 16px 10px; }
  nav a { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 7px; color: #bed0d2; text-decoration: none; font-size: 13px; }
  nav a.active { color: white; background: #365e64; box-shadow: inset 3px 0 #74bcb4; }
  nav a span { display: grid; width: 24px; height: 24px; place-items: center; border: 1px solid rgba(255,255,255,.2); border-radius: 5px; font-size: 11px; }
  .side-note { margin: auto 12px 14px; padding: 12px; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; background: rgba(255,255,255,.04); }
  .side-note strong, .side-note span { display: block; font-size: 11px; }
  .side-note span { margin-top: 5px; color: #9eb2b5; }
  main { min-width: 0; margin-left: 242px; }
  .mobile-header { display: none; }
  @media (max-width: 800px) {
    aside { left: -260px; transition: left .18s ease; }
    aside.open { left: 0; }
    main { margin-left: 0; }
    .mobile-header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; min-height: 52px; padding: 8px 12px; color: white; background: #264a52; }
    .mobile-header button { padding: 6px 10px; border: 1px solid #6f9699; border-radius: 6px; color: white; background: transparent; }
  }
</style>
