import { json } from '@sveltejs/kit'
import { nodes, mappings, reviewItems } from '$lib/seed'

export function GET() {
  return json({ nodes, mappings, reviewItems, updatedAt: '2026-09-29T08:42:00+08:00' })
}
