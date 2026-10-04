import { json } from '@sveltejs/kit'
import { z } from 'zod'
import { getGraph, getState, commit } from '$lib/reconcile/server-state'
import { resolveConflict } from '$lib/reconcile/engine'

const bodySchema = z.object({
  pendingId: z.string().min(1),
  decision: z.enum(['adopt', 'reject']),
  note: z.string().default(''),
})

export async function POST({ request }) {
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const now = new Date().toISOString()
  const outcome = resolveConflict(getState(), parsed.data, getGraph(), now)
  if (outcome.result === 'error') {
    return json({ ok: false, result: 'error', message: outcome.message }, { status: 404 })
  }
  commit(outcome.state)
  return json({ ok: true, result: outcome.result })
}
