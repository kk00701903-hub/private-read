import { useEffect, useState } from 'react'
import { fetchNovelsIndex } from '../lib/novels'
import { syncContentVersions } from '../lib/db'
import type { Novel, NovelsIndex } from '../types'

export function useNovels() {
  const [data, setData] = useState<NovelsIndex | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchNovelsIndex()
      .then(async (idx) => {
        await syncContentVersions(idx.novels)
        if (alive) {
          setData(idx)
          setError(null)
        }
      })
      .catch((e: Error) => {
        if (alive) setError(e.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const getNovel = (slug: string): Novel | undefined =>
    data?.novels.find((n) => n.slug === slug)

  return { data, error, loading, getNovel }
}
