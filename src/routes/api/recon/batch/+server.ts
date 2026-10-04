import { json } from '@sveltejs/kit'
import { z } from 'zod'
import { getSession, makeWriter } from '$lib/recon/session'

const batchSchema = z.object({
  batchId: z.string().min(1),
  /** 安排某门课程在本次写入时失败一次，用于演示批次恢复 */
  failOn: z.string().min(1).optional(),
})

export async function POST({ request }) {
  const body = await request.json().catch(() => null)
  const parsed = batchSchema.safeParse(body)
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }
  const session = getSession()
  if (parsed.data.failOn) session.failNextOn = parsed.data.failOn
  const at = new Date().toISOString()
  try {
    const batch = await session.recon.runBatch({ batchId: parsed.data.batchId, at, write: makeWriter(session) })
    return json({ ok: true, batch, state: session.recon.state, writerLog: session.writerLog })
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        batch: session.recon.state.batches[parsed.data.batchId],
        state: session.recon.state,
        writerLog: session.writerLog,
      },
      { status: 500 },
    )
  }
}
