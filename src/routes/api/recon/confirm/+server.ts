import { json } from '@sveltejs/kit'
import { z } from 'zod'
import { getSession } from '$lib/recon/session'

const confirmSchema = z.object({
  mappingId: z.string().min(1),
  owner: z.string().min(2, '请填写负责人姓名（至少 2 个字符）'),
  weight: z.number().min(0).max(1).optional(),
  expectedRevision: z.number().int().nonnegative(),
})

/**
 * 两名负责人并发确认的仲裁：
 * - 以 (mappingId, expectedRevision) 为键做进程内原子占位（CAS），
 *   并行到达的两个请求只有先拿到占位的一方进入写入；
 * - 占位保留一个很短的存活窗口（模拟双方几乎同时提交），
 *   窗口内后到的一方落败，内容留作待核；窗口外的重复提交按常规幂等处理。
 */
type Claim = { owner: string; weight: number; expires: number }
const claims = new Map<string, Claim>()
const CLAIM_TTL_MS = 4000

export async function POST({ request }) {
  const body = await request.json().catch(() => null)
  const parsed = confirmSchema.safeParse(body)
  if (!parsed.success) {
    return json({ ok: false, error: parsed.error.flatten() }, { status: 400 })
  }
  const input = parsed.data
  const session = getSession()
  const at = new Date().toISOString()
  const lockKey = `${input.mappingId}@${input.expectedRevision}`
  const now = Date.now()
  const existing = claims.get(lockKey)
  if (existing && existing.expires <= now) claims.delete(lockKey)

  const holder = claims.get(lockKey)
  if (holder && holder.owner !== input.owner) {
    const pending = session.recon.registerConflictingSubmission({
      mappingId: input.mappingId,
      owner: input.owner,
      weight: input.weight ?? holder.weight,
      expectedRevision: input.expectedRevision,
      at,
      winnerOwner: holder.owner,
    })
    return json({
      ok: true,
      outcome: { outcome: 'lost-race', mappingId: input.mappingId, winnerOwner: holder.owner, pendingId: pending?.id },
      state: session.recon.state,
    })
  }

  claims.set(lockKey, { owner: input.owner, weight: input.weight ?? 1, expires: now + CLAIM_TTL_MS })
  const outcome = session.recon.confirmMapping({ ...input, at })
  return json({ ok: true, outcome, state: session.recon.state })
}
