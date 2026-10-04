import { z } from 'zod'

export const revisionSchema = z.object({
  courseId: z.string().min(1, '请选择课程'),
  requirementId: z.string().min(1, '请选择毕业要求'),
  evidence: z.string().min(12, '证据说明至少需要 12 个字符'),
  revisionNote: z.string().min(8, '修订说明至少需要 8 个字符'),
  submitter: z.string().min(2, '请填写提交人'),
})

export const mappingSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  relation: z.enum(['支撑', '前置', '考核', '教学']),
  weight: z.number().min(0).max(1),
})

export const catalogPushSchema = z.object({
  courseNo: z.string().min(1, '请填写课程编号'),
  name: z.string().min(1, '请填写课程名称'),
  semester: z.string().min(1, '请填写学期'),
  revisionNo: z.string().min(1, '请填写修订号'),
  prerequisites: z.array(z.string()).default([]),
})

export type RevisionInput = z.infer<typeof revisionSchema>
export type CatalogPushInput = z.infer<typeof catalogPushSchema>
