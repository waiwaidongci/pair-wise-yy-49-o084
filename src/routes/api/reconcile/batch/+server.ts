import { json } from '@sveltejs/kit'
import { z } from 'zod'
import { getGraph, getState, commit, SEMESTER } from '$lib/reconcile/server-state'
import { resumeBatch, startBatch } from '$lib/reconcile/engine'

const bodySchema = z.object({
  action: z.enum(['start', 'resume']),
  semester: z.string().default(SEMESTER),
  failureCourse: z.string().nullable().optional(),
})

export async function POST({ request }) {
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const now = new Date().toISOString()
  const state = getState()
  const outcome =
    parsed.data.action === 'resume'
      ? resumeBatch(state, getGraph(), now)
      : startBatch(state, { semester: parsed.data.semester, failureCourse: parsed.data.failureCourse }, getGraph(), now)
  commit(outcome.state)
  if (outcome.result === 'not-failed') {
    return json({ ok: false, result: 'not-failed', message: '当前没有失败的批次，无需恢复' }, { status: 409 })
  }
  return json({ ok: true, result: outcome.result, batch: outcome.batch })
}
