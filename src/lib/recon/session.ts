import { Recon } from './engine'
import { buildScenario } from './seed'
import type { ExternalCourse, LocalMapping } from './types'

export type WriterEvent = {
  at: string
  code: string
  revision: number
  outcome: 'written' | 'skipped-confirmed'
}

type Session = {
  recon: Recon
  /** 下次批次在指定课程上抛出写入失败，用于演示失败恢复 */
  failNextOn: string | null
  writerLog: WriterEvent[]
}

function freshSession(): Session {
  return { recon: new Recon(buildScenario()), failNextOn: null, writerLog: [] }
}

// 单进程内存会话；演示/对账状态在 reset 时回到初始场景
const globalKey = Symbol.for('curriculum-recon-session')
const globalStore = globalThis as unknown as Record<symbol, Session | undefined>

export function getSession(): Session {
  let session = globalStore[globalKey]
  if (!session) {
    session = freshSession()
    globalStore[globalKey] = session
  }
  return session
}

export function resetSession(): Session {
  const session = freshSession()
  globalStore[globalKey] = session
  return session
}

/** 批次写入：把来源侧结果提交到本地映射；可安排指定课程失败一次以演练恢复 */
export function makeWriter(session: Session) {
  return async (course: ExternalCourse, mappings: LocalMapping[]) => {
    if (session.failNextOn === course.code) {
      session.failNextOn = null
      throw new Error(`课程 ${course.code}（修订 ${course.revision}）写入失败：连接教务系统写入通道超时`)
    }
    session.writerLog.push({
      at: new Date().toISOString(),
      code: course.code,
      revision: course.revision,
      outcome: mappings.every((m) => m.status === 'confirmed') ? 'skipped-confirmed' : 'written',
    })
  }
}
