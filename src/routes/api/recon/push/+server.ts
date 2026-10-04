import { json } from '@sveltejs/kit'
import { z } from 'zod'
import { getSession } from '$lib/recon/session'

const courseSchema = z.object({
  code: z.string().min(1),
  term: z.string().min(1),
  revision: z.number().int().nonnegative(),
  title: z.string().min(1),
  prerequisites: z.array(z.string().min(1)),
  updatedAt: z.string().min(1),
})

const pushSchema = z.object({
  batchId: z.string().min(1),
  pushedAt: z.string().min(1).optional(),
  courses: z.array(courseSchema).min(1),
})

export async function POST({ request }) {
  const body = await request.json().catch(() => null)
  const parsed = pushSchema.safeParse(body)
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }
  const session = getSession()
  const push = { ...parsed.data, pushedAt: parsed.data.pushedAt ?? new Date().toISOString() }
  try {
    const receipt = session.recon.ingestPush(push)
    return json({ ok: true, receipt, state: session.recon.state })
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 409 })
  }
}
