# 高校课程标准映射与课程改革审阅平台

面向教研人员、课程负责人和院系审阅人的课程图谱平台，支持培养目标、毕业要求、课程单元、教学活动、考核任务映射，以及有向图检查、覆盖矩阵、拖拽连边、自动保存、批量审核和课程地图导出。

## 技术栈

SvelteKit + Skeleton UI + Svelte stores + SvelteKit Form Actions + TanStack Query + Zod + Vite + TypeScript

## 本地运行

```bash
npm install
npm run dev
```

访问 `http://localhost:62049`，生产构建使用 `npm run build`。

## 核心工作流

- 在培养目标、毕业要求、课程、单元和考核之间建立有向映射。
- 自动检查前置关系、覆盖缺口、重复映射和不完整考核证据。
- 课程负责人提交修订，院系审阅人逐条退回、附议或要求补充证据。
- 比较版本覆盖变化，恢复草稿并导出专业课程地图。
