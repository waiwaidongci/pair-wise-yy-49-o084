import { w as writable } from "./index3.js";
import { s as seedState } from "./seed.js";
const initial = structuredClone(seedState);
function createCurriculumStore() {
  const { subscribe, update, set } = writable({ ...initial, draft: initial.draft ?? "C-308 对 GR-06 的案例证据不足，需补充评分记录。" });
  return {
    subscribe,
    set,
    update,
    moveNode(id, x, y) {
      update((state) => ({ ...state, nodes: state.nodes.map((node) => node.id === id ? { ...node, x, y } : node) }));
    },
    addMapping(source, target, relation, weight) {
      update((state) => ({ ...state, mappings: [...state.mappings, { id: `M-${Date.now()}`, source, target, relation, weight }] }));
    },
    updateReview(id, status, comment) {
      update((state) => ({ ...state, reviewItems: state.reviewItems.map((item) => item.id === id ? { ...item, status, comment } : item) }));
    },
    saveDraft(draft) {
      update((state) => ({ ...state, draft }));
    },
    lock(revision) {
      update((state) => ({ ...state, revision, locked: true }));
    }
  };
}
const curriculumStore = createCurriculumStore();
function validateCurriculum(state) {
  const issues = [];
  const outgoing = /* @__PURE__ */ new Map();
  state.mappings.forEach((mapping) => outgoing.set(mapping.source, [...outgoing.get(mapping.source) ?? [], mapping]));
  state.nodes.filter((node) => node.type === "毕业要求").forEach((node) => {
    if (!(outgoing.get(node.id) ?? []).some((mapping) => state.nodes.find((item) => item.id === mapping.target)?.type === "课程")) {
      issues.push({ id: `coverage-${node.id}`, severity: "错误", title: `${node.label.split("\n")[0]} 存在覆盖缺口`, detail: "未关联任何课程支撑证据。" });
    }
  });
  const seen = /* @__PURE__ */ new Set();
  state.mappings.forEach((mapping) => {
    const key = `${mapping.source}-${mapping.target}-${mapping.relation}`;
    if (seen.has(key)) issues.push({ id: `dup-${mapping.id}`, severity: "警告", title: `${mapping.id} 为重复映射`, detail: "相同来源、目标和关系重复录入，可合并。" });
    seen.add(key);
  });
  return issues;
}
export {
  curriculumStore as c,
  validateCurriculum as v
};
