import { json } from '@sveltejs/kit'
import { getSession, resetSession } from '$lib/recon/session'

export function GET() {
  const session = getSession()
  return json({ state: session.recon.state, writerLog: session.writerLog, failNextOn: session.failNextOn })
}

export async function POST({ request }) {
  const body = await request.json().catch(() => ({}))
  if (body?.action === 'reset') {
    const session = resetSession()
    return json({ ok: true, state: session.recon.state, writerLog: session.writerLog })
  }
  if (body?.action === 'recompute') {
    const session = getSession()
    const results = session.recon.recomputeCoverage(new Date().toISOString())
    return json({ ok: true, coverage: results, state: session.recon.state })
  }
  return json({ ok: false, error: '未知操作，支持 reset / recompute' }, { status: 400 })
}
