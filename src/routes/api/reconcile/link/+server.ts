import { json } from '@sveltejs/kit'
import { z } from 'zod'
import { getGraph, getState, commit, SEMESTER } from '$lib/reconcile/server-state'
import { linkCourse } from '$lib/reconcile/engine'

const bodySchema = z.object({
  localCourseId: z.string().min(1),
  externalCourseNo: z.string().min(1, '请填写外部课程编号'),
  semester: z.string().default(SEMESTER),
})

export async function POST({ request }) {
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const now = new Date().toISOString()
  const outcome = linkCourse(getState(), parsed.data, getGraph(), now)
  if (outcome.result === 'error') {
    return json({ ok: false, result: 'error', message: outcome.message }, { status: 404 })
  }
  commit(outcome.state)
  return json({ ok: true, result: outcome.result })
}
