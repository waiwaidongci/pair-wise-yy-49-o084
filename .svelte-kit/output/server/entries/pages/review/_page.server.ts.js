import { fail } from "@sveltejs/kit";
import { z } from "zod";
import { r as reviewItems } from "../../../chunks/seed.js";
const revisionSchema = z.object({
  courseId: z.string().min(1, "请选择课程"),
  requirementId: z.string().min(1, "请选择毕业要求"),
  evidence: z.string().min(12, "证据说明至少需要 12 个字符"),
  revisionNote: z.string().min(8, "修订说明至少需要 8 个字符"),
  submitter: z.string().min(2, "请填写提交人")
});
z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  relation: z.enum(["支撑", "前置", "考核", "教学"]),
  weight: z.number().min(0).max(1)
});
const actions = {
  submitRevision: async ({ request }) => {
    const form = await request.formData();
    const parsed = revisionSchema.safeParse({
      courseId: form.get("courseId"),
      requirementId: form.get("requirementId"),
      evidence: form.get("evidence"),
      revisionNote: form.get("revisionNote"),
      submitter: form.get("submitter")
    });
    if (!parsed.success) {
      return fail(400, { errors: parsed.error.flatten().fieldErrors, values: Object.fromEntries(form) });
    }
    const item = {
      id: `REV-${Date.now().toString().slice(-4)}`,
      courseId: parsed.data.courseId,
      requirementId: parsed.data.requirementId,
      evidence: `${parsed.data.evidence} 修订说明：${parsed.data.revisionNote}`,
      submitter: parsed.data.submitter,
      status: "待审阅",
      comment: ""
    };
    reviewItems.unshift(item);
    return { success: true, item };
  }
};
export {
  actions
};
