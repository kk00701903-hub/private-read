import { deleteAllDrafts, flushDb, getDb } from './db'

const LEGACY_PROGRESS = 'read-pwa:progress'

export type ClearCacheResult = {
  drafts: number
  cacheBuckets: number
}

/** 수정 원고 + PWA 캐시(회차 md 포함) 삭제. 글자 크기 등 설정은 유지. */
export async function clearManuscriptCache(): Promise<ClearCacheResult> {
  const drafts = await deleteAllDrafts()

  // content_versions도 리셋해 다음 로드 시 서버 버전과 다시 맞춤
  try {
    const db = await getDb()
    db.run(`DELETE FROM content_versions`)
    await flushDb()
  } catch {
    /* ignore */
  }

  try {
    localStorage.removeItem(LEGACY_PROGRESS)
  } catch {
    /* ignore */
  }

  let cacheBuckets = 0
  if ('caches' in window) {
    const keys = await caches.keys()
    cacheBuckets = keys.length
    await Promise.all(keys.map((key) => caches.delete(key)))
  }

  // 서비스 워커가 옛 응답을 붙잡지 않도록 갱신 시도
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      regs.map(async (reg) => {
        try {
          await reg.update()
        } catch {
          /* ignore */
        }
      }),
    )
  }

  return { drafts, cacheBuckets }
}
