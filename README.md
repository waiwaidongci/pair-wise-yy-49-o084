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

## 每周课程目录对账（/recon）

把教务系统外部课程目录、本地人工映射与毕业要求覆盖结论接成一次可续作的对账，核心规则：

1. **推送幂等**：推送条目带「课程编号 + 学期 + 修订号」；同一批次号重复推送沿用第一次收据（`duplicated`），同修订课程在新批次按 `unchanged` 处理；修订号前进但先修未变只前移确认基准，不触发失效；拒绝修订号回退。
2. **先修一变即失效**：先修链变化的课程，其本地映射立即置 `stale`、引用该课程的覆盖结论置 `invalidated`；已确认/人工值原样保留，漂移的人工值进入待核队列，不被来源变化静默覆盖。
3. **确认走基准修订 CAS**：负责人确认时携带 `expectedRevision`，与目录当前修订一致才放行；同基准并发只有一方 `committed`，落败内容（含提议权重）以 `confirm-loser` 入待核；基准落后直接判 `revision-moved`。
4. **批次可续跑**：批次按课程计划顺序写入并逐课落检查点；写入失败的课程不入检查点，用同一批次号恢复时从最后完成课程继续；已在当前修订确认的课程标 `skippedConfirmed`，不重复写入。
5. **缺编号兼容**：历史映射缺外部编号时为 `pending-code` 保留但不计入覆盖（在结论中列 `excludedLegacy`）；目录给出编号后经「补编号 → 批次重算 → 确认」接回对账。
6. 失效的覆盖结论不会自动翻新，必须显式重算。

- 领域引擎（纯函数状态机）：`src/lib/recon/engine.ts`，类型：`src/lib/recon/types.ts`
- REST 接口：`POST /api/recon/push|batch|confirm|manual|backfill`、`GET/POST /api/recon`（reset/recompute）
- 对账工作台：`/recon`，可按步骤演练推送失效、并发仲裁、批次失败恢复、补编号接回

```bash
npm run test:recon     # 引擎单元测试（15 条）
node scripts/run-tests.ts.mjs scripts/e2e-recon.ts   # HTTP 端到端演练（18 项断言）
```

