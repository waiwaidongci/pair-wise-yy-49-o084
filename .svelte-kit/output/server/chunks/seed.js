const nodes = [
  { id: "OBJ-01", label: "培养目标 1\n服务区域数字产业", type: "目标", x: 70, y: 70 },
  { id: "OBJ-02", label: "培养目标 2\n具备工程创新能力", type: "目标", x: 70, y: 210 },
  { id: "GR-01", label: "毕业要求 1\n工程知识", type: "毕业要求", x: 310, y: 50 },
  { id: "GR-03", label: "毕业要求 3\n设计解决方案", type: "毕业要求", x: 310, y: 180 },
  { id: "GR-06", label: "毕业要求 6\n工程与社会", type: "毕业要求", x: 310, y: 310 },
  { id: "C-101", label: "程序设计基础\nC-101", type: "课程", x: 570, y: 40 },
  { id: "C-205", label: "数据结构与算法\nC-205", type: "课程", x: 570, y: 170 },
  { id: "C-308", label: "软件工程实践\nC-308", type: "课程", x: 570, y: 300 },
  { id: "U-205-02", label: "图与路径算法\n单元", type: "单元", x: 830, y: 110 },
  { id: "U-308-04", label: "需求与迭代评审\n单元", type: "单元", x: 830, y: 240 },
  { id: "T-308-04A", label: "迭代评审演练\n教学活动", type: "教学活动", x: 1070, y: 170 },
  { id: "A-308-04A", label: "需求追踪矩阵\n考核任务", type: "考核", x: 1070, y: 310 }
];
const mappings = [
  { id: "M-01", source: "OBJ-01", target: "GR-01", relation: "支撑", weight: 0.9 },
  { id: "M-02", source: "OBJ-02", target: "GR-03", relation: "支撑", weight: 1 },
  { id: "M-03", source: "GR-01", target: "C-101", relation: "支撑", weight: 0.9 },
  { id: "M-04", source: "GR-03", target: "C-205", relation: "支撑", weight: 0.8 },
  { id: "M-05", source: "GR-03", target: "C-308", relation: "支撑", weight: 1 },
  { id: "M-06", source: "GR-06", target: "C-308", relation: "支撑", weight: 0.7 },
  { id: "M-07", source: "C-205", target: "U-205-02", relation: "前置", weight: 0.85 },
  { id: "M-08", source: "C-308", target: "U-308-04", relation: "支撑", weight: 0.9 },
  { id: "M-09", source: "U-308-04", target: "T-308-04A", relation: "教学", weight: 1 },
  { id: "M-10", source: "T-308-04A", target: "A-308-04A", relation: "考核", weight: 0.8 },
  { id: "M-11", source: "GR-06", target: "C-308", relation: "支撑", weight: 0.7 }
];
const reviewItems = [
  { id: "REV-201", courseId: "C-308", requirementId: "GR-03", evidence: "需求追踪矩阵、迭代评审记录、测试覆盖报告与教师评价量表。", submitter: "软件工程课程组", status: "待审阅", comment: "" },
  { id: "REV-202", courseId: "C-308", requirementId: "GR-06", evidence: "增加数据合规案例分析，但尚未提供评分记录。", submitter: "软件工程课程组", status: "待审阅", comment: "" },
  { id: "REV-203", courseId: "C-205", requirementId: "GR-01", evidence: "图算法实践已覆盖复杂工程问题建模，作业与测验记录完整。", submitter: "数据结构课程组", status: "已附议", comment: "覆盖证据充分，建议保留。" }
];
const seedState = { nodes, mappings, reviewItems, revision: "R12", locked: false };
export {
  mappings as m,
  nodes as n,
  reviewItems as r,
  seedState as s
};
