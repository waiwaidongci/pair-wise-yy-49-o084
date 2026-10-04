import { json } from '@sveltejs/kit'
import { z } from 'zod'
import { getSession } from '$lib/recon/session'

const backfillSchema = z.object({
  mappingId: z.string().min(1),
  code: z.string().min(1, '请填写外部课程编号'),
})

export async function POST({ request }) {
  const body = await request.json().catch(() => null)
  const parsed = backfillSchema.safeParse(body)
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }
  const session = getSession()
  const result = session.recon.backfillExternalCode({
    mappingId: parsed.data.mappingId,
    code: parsed.data.code,
    at: new Date().toISOString(),
  })
  const status = result.outcome === 'linked' ? 200 : result.outcome === 'catalog-missing' ? 422 : 409
  return json({ ok: result.outcome === 'linked', result, state: session.recon.state }, { status })
}
