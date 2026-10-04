import { json } from '@sveltejs/kit'
import { catalogPushSchema } from '$lib/schema'
import { getGraph, getState, commit } from '$lib/reconcile/server-state'
import { ingestPush } from '$lib/reconcile/engine'

export async function POST({ request }) {
  const parsed = catalogPushSchema.safeParse(await request.json())
  if (!parsed.success) {
    return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const now = new Date().toISOString()
  const snapshot = { ...parsed.data, receivedAt: now }
  const outcome = ingestPush(getState(), snapshot, getGraph(), now)
  if (outcome.result === 'duplicate') {
    // 同一修订重复推送：沿用第一次结果，不触发失效重算
    return json({ ok: true, result: 'duplicate', duplicateOf: outcome.duplicateOf })
  }
  commit(outcome.state)
  return json({ ok: true, result: 'applied', affected: outcome.affected })
}
