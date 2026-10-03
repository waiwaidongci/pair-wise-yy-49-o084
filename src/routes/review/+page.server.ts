import { fail } from '@sveltejs/kit'
import { revisionSchema } from '$lib/schema'
import { reviewItems } from '$lib/seed'

export const actions = {
  submitRevision: async ({ request }) => {
    const form = await request.formData()
    const parsed = revisionSchema.safeParse({
      courseId: form.get('courseId'),
      requirementId: form.get('requirementId'),
      evidence: form.get('evidence'),
      revisionNote: form.get('revisionNote'),
      submitter: form.get('submitter'),
    })
    if (!parsed.success) {
      return fail(400, { errors: parsed.error.flatten().fieldErrors, values: Object.fromEntries(form) })
    }
    const item = {
      id: `REV-${Date.now().toString().slice(-4)}`,
      courseId: parsed.data.courseId,
      requirementId: parsed.data.requirementId,
      evidence: `${parsed.data.evidence} 修订说明：${parsed.data.revisionNote}`,
      submitter: parsed.data.submitter,
      status: '待审阅' as const,
      comment: '',
    }
    reviewItems.unshift(item)
    return { success: true, item }
  },
}
