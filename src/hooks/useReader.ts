import { useCallback, useEffect, useState } from 'react'
import type { ReaderSettings } from '../types'
import {
  flushDb,
  getProgress,
  listProgress,
  upsertProgress,
  type ReadingProgressRow,
} from '../lib/db'

const KEY = 'read-pwa:settings'

const defaults: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.85,
  theme: 'paper',
  width: 'normal',
}

export function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults
    } catch {
      return defaults
    }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(settings))
  }, [settings])

  return { settings, setSettings }
}

export type ProgressMap = Record<
  string,
  { episodeId: string; updatedAt: number; scrollY: number; scrollRatio: number }
>

function toMap(rows: ReadingProgressRow[]): ProgressMap {
  const map: ProgressMap = {}
  for (const row of rows) {
    map[row.novelSlug] = {
      episodeId: row.episodeId,
      updatedAt: row.updatedAt,
      scrollY: row.scrollY,
      scrollRatio: row.scrollRatio,
    }
  }
  return map
}

export function useReadingProgress() {
  const [progress, setProgress] = useState<ProgressMap>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    listProgress()
      .then((rows) => {
        if (!alive) return
        setProgress(toMap(rows))
        setReady(true)
      })
      .catch((err) => {
        console.error('[sqlite] load progress failed', err)
        if (alive) setReady(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const saveProgress = useCallback(
    async (input: {
      novelSlug: string
      episodeId: string
      scrollY?: number
      scrollRatio?: number
    }) => {
      const row = await upsertProgress(input)
      setProgress((prev) => ({
        ...prev,
        [row.novelSlug]: {
          episodeId: row.episodeId,
          updatedAt: row.updatedAt,
          scrollY: row.scrollY,
          scrollRatio: row.scrollRatio,
        },
      }))
      return row
    },
    [],
  )

  const loadProgress = useCallback(async (novelSlug: string) => {
    return getProgress(novelSlug)
  }, [])

  const persistNow = useCallback(async () => {
    await flushDb()
  }, [])

  return { progress, ready, saveProgress, loadProgress, persistNow }
}
