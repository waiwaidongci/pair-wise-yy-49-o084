import { json } from '@sveltejs/kit'
import { getGraph, getState } from '$lib/reconcile/server-state'

export function GET() {
  return json({ state: getState(), graph: getGraph() })
}
