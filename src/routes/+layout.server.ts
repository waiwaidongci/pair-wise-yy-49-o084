export function load({ url }: { url: URL }) {
  const titles: Record<string, string> = {
    '/': '课程标准映射总览',
    '/courses': '课程、单元与考核',
    '/matrix': '映射图谱与覆盖矩阵',
    '/review': '课程改革审阅',
    '/reconcile': '课程对账中心',
  }
  return { title: titles[url.pathname] ?? '课程改革审阅平台' }
}
