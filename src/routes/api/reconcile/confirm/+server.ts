import { json } from '@sveltejs/kit'
import { z } from 'zod'
import { getGraph, getState, commit } from '$lib/reconcile/server-state'
import { confirmCourse, type ManualOverride } from '$lib/reconcile/engine'

const overrideSchema = z.object({
  mappingKey: z.string().min(1),
  field: z.enum(['weight', 'relation']),
  value: z.union([z.number(), z.string()]),
  reason: z.string().default(''),
  baselineRevision: z.string().min(1),
})

const bodySchema = z.object({
  localCourseId: z.string().min(1),
  submitter: z.string().min(1, '请填写提交人'),
  baselineRevision: z.string().min(1, '请填写基准修订'),
  baselineVersion: z.number().int().min(1),
  note: z.string().default(''),
  overrides: z.array(overrideSchema).optional(),
})

export async function POST({ request }) {
  const parsed = bodySchema.safeParse(await request.json())
  if (!parsed.success) {
    return json({ ok: false, errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const now = new Date().toISOString()
  const overrides: ManualOverride[] = (parsed.data.overrides ?? []).map((o) => ({
    ...o,
    reason: o.reason || parsed.data.note,
  }))
  const outcome = confirmCourse(
    getState(),
    {
      localCourseId: parsed.data.localCourseId,
      submitter: parsed.data.submitter,
      baselineRevision: parsed.data.baselineRevision,
      baselineVersion: parsed.data.baselineVersion,
      note: parsed.data.note,
      overrides,
    },
    getGraph(),
    now,
  )
  if (outcome.result === 'error') {
    return json({ ok: false, result: 'error', message: outcome.message }, { status: 409 })
  }
  commit(outcome.state)
  if (outcome.result === 'conflict') {
    // 基准修订不一致：落败内容留作待核，不写入
    return json({ ok: true, result: 'conflict', pending: outcome.pending })
  }
  return json({ ok: true, result: 'confirmed' })
}
