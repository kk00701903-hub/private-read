import { useCallback, useEffect, useState } from 'react'
import type { ReaderSettings } from '../types'

const KEY = 'read-pwa:settings'
const PROGRESS_KEY = 'read-pwa:progress'

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

export type ProgressMap = Record<string, { episodeId: string; updatedAt: number }>

export function useReadingProgress() {
  const [progress, setProgress] = useState<ProgressMap>(() => {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')
    } catch {
      return {}
    }
  })

  const saveProgress = useCallback((slug: string, episodeId: string) => {
    setProgress((prev) => {
      const next = {
        ...prev,
        [slug]: { episodeId, updatedAt: Date.now() },
      }
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { progress, saveProgress }
}
