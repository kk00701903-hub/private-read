import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { NovelCard } from '../components/NovelCard'
import { useNovels } from '../hooks/useNovels'
import { useReadingProgress } from '../hooks/useReader'
import { listAllDrafts, type EpisodeDraftRow } from '../lib/db'
import { exportDraftEpisodesAsMarkdown } from '../lib/manuscript'
import type { Novel } from '../types'

type AdaptedItem = {
  novel: Novel
  draft: EpisodeDraftRow
  episodeNumber: number
  episodeTitle: string
}

export function LibraryPage() {
  const { data, loading, error } = useNovels()
  const { progress } = useReadingProgress()
  const [drafts, setDrafts] = useState<EpisodeDraftRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refreshDrafts = () => {
    listAllDrafts()
      .then(setDrafts)
      .catch(console.error)
  }

  useEffect(() => {
    refreshDrafts()
  }, [data])

  const continued =
    data?.novels
      .filter((n) => progress[n.slug])
      .sort((a, b) => (progress[b.slug]?.updatedAt ?? 0) - (progress[a.slug]?.updatedAt ?? 0)) ?? []

  const adaptedItems: AdaptedItem[] = useMemo(() => {
    if (!data) return []
    const items: AdaptedItem[] = []
    for (const draft of drafts) {
      const novel = data.novels.find((n) => n.slug === draft.novelSlug)
      if (!novel) continue
      const ep = novel.episodes.find((e) => e.id === draft.episodeId)
      if (!ep) continue
      items.push({
        novel,
        draft,
        episodeNumber: ep.number,
        episodeTitle: draft.title || ep.title,
      })
    }
    return items.sort((a, b) => b.draft.updatedAt - a.draft.updatedAt)
  }, [data, drafts])

  const keyOf = (item: AdaptedItem) => `${item.novel.slug}::${item.draft.episodeId}`

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAllAdapted = () => {
    if (selected.size === adaptedItems.length) setSelected(new Set())
    else setSelected(new Set(adaptedItems.map(keyOf)))
  }

  const onExport = async () => {
    if (!data || selected.size === 0) return
    setExporting(true)
    setMessage(null)
    try {
      // group by novel
      const byNovel = new Map<string, string[]>()
      for (const item of adaptedItems) {
        const key = keyOf(item)
        if (!selected.has(key)) continue
        const list = byNovel.get(item.novel.slug) ?? []
        list.push(item.draft.episodeId)
        byNovel.set(item.novel.slug, list)
      }

      let total = 0
      for (const [slug, ids] of byNovel) {
        const novel = data.novels.find((n) => n.slug === slug)
        if (!novel) continue
        const result = await exportDraftEpisodesAsMarkdown(novel, ids)
        total += result.count
      }
      setMessage(`${total}화 각색 원고를 MD로 내보냈습니다.`)
      refreshDrafts()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '내보내기에 실패했습니다.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>보관함</h1>
        <p className="lede">최근 읽은 작품 · 각색 원고</p>
      </header>

      {loading && <p className="state">불러오는 중…</p>}
      {error && <p className="state error">{error}</p>}

      <section className="library-section" aria-label="각색원고">
        <div className="library-section-head">
          <h2>각색원고</h2>
          {adaptedItems.length > 0 && (
            <span className="library-count">{adaptedItems.length}화</span>
          )}
        </div>

        {adaptedItems.length === 0 ? (
          <p className="state compact">
            아직 각색한 회차가 없습니다.
            <br />
            <Link to="/edit">원고 편집</Link>에서 화면을 눌러 수정·저장하세요.
          </p>
        ) : (
          <>
            <div className="edit-toolbar">
              <label className="check-all">
                <input
                  type="checkbox"
                  checked={selected.size === adaptedItems.length && adaptedItems.length > 0}
                  onChange={toggleAllAdapted}
                />
                전체 선택
              </label>
              <button
                type="button"
                className="primary-btn install-btn compact"
                disabled={selected.size === 0 || exporting}
                onClick={() => void onExport()}
              >
                {exporting ? '내보내는 중…' : `MD 내보내기 (${selected.size})`}
              </button>
            </div>
            {message && <p className="export-msg">{message}</p>}
            <ul className="adapted-list">
              {adaptedItems.map((item) => {
                const key = keyOf(item)
                return (
                  <li key={key} className="adapted-card">
                    <label className="edit-check">
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggle(key)}
                      />
                    </label>
                    <div className="adapted-body">
                      <div className="adapted-top">
                        <span className="ep-badge">각색원고</span>
                        <span className="adapted-novel">{item.novel.title}</span>
                      </div>
                      <Link
                        to={`/edit/${item.novel.slug}/${item.draft.episodeId}`}
                        className="adapted-title"
                      >
                        {item.episodeNumber}화 · {item.episodeTitle}
                      </Link>
                      <pre className="adapted-summary">
                        {item.draft.changeSummary || '변경 요약 없음 (다시 저장하면 생성됩니다)'}
                      </pre>
                      <p className="adapted-time">
                        {new Date(item.draft.updatedAt).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <section className="library-section" aria-label="최근 읽은 작품">
        <div className="library-section-head">
          <h2>이어보기</h2>
        </div>
        {!loading && continued.length === 0 && (
          <p className="state compact">
            아직 읽은 작품이 없습니다.
            <br />
            <Link to="/">홈에서 작품을 골라보세요</Link>
          </p>
        )}
        <div className="novel-list">
          {continued.map((novel) => (
            <NovelCard
              key={novel.slug}
              novel={novel}
              continueEpisodeId={progress[novel.slug]?.episodeId}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
