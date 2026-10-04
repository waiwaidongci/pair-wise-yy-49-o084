import { json } from '@sveltejs/kit'
import { z } from 'zod'
import { getSession } from '$lib/recon/session'

const manualSchema = z.object({
  mappingId: z.string().min(1),
  weight: z.number().min(0).max(1),
  owner: z.string().min(2),
  note: z.string().min(2, '请填写人工调整说明'),
})

export async function POST({ request }) {
  const body = await request.json().catch(() => null)
  const parsed = manualSchema.safeParse(body)
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }
  const session = getSession()
  try {
    const result = session.recon.applyManualAdjustment({ ...parsed.data, at: new Date().toISOString() })
    return json({ ok: true, result, state: session.recon.state })
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 404 })
  }
}
