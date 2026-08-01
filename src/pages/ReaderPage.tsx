import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNovels } from '../hooks/useNovels'
import { useReaderSettings, useReadingProgress } from '../hooks/useReader'
import { fetchEpisodeContent, stripFrontmatter } from '../lib/novels'
import { ReaderSettingsPanel } from '../components/ReaderSettingsPanel'

function scrollMetrics() {
  const el = document.documentElement
  const max = Math.max(el.scrollHeight - el.clientHeight, 0)
  const y = window.scrollY || 0
  return {
    scrollY: y,
    scrollRatio: max > 0 ? Math.min(1, Math.max(0, y / max)) : 0,
  }
}

export function ReaderPage() {
  const { slug = '', episodeId = '' } = useParams()
  const navigate = useNavigate()
  const { getNovel, loading: novelsLoading } = useNovels()
  const novel = getNovel(slug)
  const { settings, setSettings } = useReaderSettings()
  const { saveProgress, loadProgress, persistNow, ready } = useReadingProgress()
  const [raw, setRaw] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const restoredRef = useRef<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const episodeIndex = novel?.episodes.findIndex((e) => e.id === episodeId) ?? -1
  const episode = episodeIndex >= 0 ? novel!.episodes[episodeIndex] : undefined
  const prev = episodeIndex > 0 ? novel!.episodes[episodeIndex - 1] : null
  const next =
    novel && episodeIndex >= 0 && episodeIndex < novel.episodes.length - 1
      ? novel.episodes[episodeIndex + 1]
      : null

  const body = useMemo(() => stripFrontmatter(raw), [raw])

  useEffect(() => {
    if (!novel || !episode) return
    let alive = true
    setLoading(true)
    setError(null)
    restoredRef.current = null
    fetchEpisodeContent(novel, episode.id, episode.file)
      .then((text) => {
        if (alive) setRaw(text)
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
  }, [novel, episode])

  // 회차 진입 시 저장 + 스크롤 복원
  useEffect(() => {
    if (!ready || !novel || !episode || loading || error) return
    const key = `${novel.slug}:${episode.id}`
    if (restoredRef.current === key) return

    let cancelled = false
    ;(async () => {
      const saved = await loadProgress(novel.slug)
      if (cancelled) return

      const sameEpisode = saved?.episodeId === episode.id
      await saveProgress({
        novelSlug: novel.slug,
        episodeId: episode.id,
        scrollY: sameEpisode ? saved?.scrollY ?? 0 : 0,
        scrollRatio: sameEpisode ? saved?.scrollRatio ?? 0 : 0,
      })

      requestAnimationFrame(() => {
        if (cancelled) return
        if (sameEpisode && saved && (saved.scrollY > 0 || saved.scrollRatio > 0)) {
          const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
          const target =
            saved.scrollY > 0 ? saved.scrollY : Math.round(max * (saved.scrollRatio || 0))
          window.scrollTo({ top: target, behavior: 'auto' })
        } else {
          window.scrollTo({ top: 0, behavior: 'auto' })
        }
        restoredRef.current = key
      })
    })()

    return () => {
      cancelled = true
    }
  }, [ready, novel, episode, loading, error, loadProgress, saveProgress])

  // 스크롤 위치 저장 (디바운스)
  useEffect(() => {
    if (!ready || !novel || !episode || loading) return

    const onScroll = () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const { scrollY, scrollRatio } = scrollMetrics()
        void saveProgress({
          novelSlug: novel.slug,
          episodeId: episode.id,
          scrollY,
          scrollRatio,
        })
      }, 300)
    }

    const onHide = () => {
      const { scrollY, scrollRatio } = scrollMetrics()
      void saveProgress({
        novelSlug: novel.slug,
        episodeId: episode.id,
        scrollY,
        scrollRatio,
      }).then(() => persistNow())
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [ready, novel, episode, loading, saveProgress, persistNow])

  if (novelsLoading) return <p className="state page">불러오는 중…</p>
  if (!novel || !episode) {
    return (
      <p className="state error page">
        회차를 찾을 수 없습니다. <Link to="/">홈으로</Link>
      </p>
    )
  }

  return (
    <div
      className={`reader theme-${settings.theme}`}
      style={
        {
          '--reader-size': `${settings.fontSize}px`,
          '--reader-leading': settings.lineHeight,
        } as CSSProperties
      }
    >
      <header className={`reader-chrome top ${chromeVisible ? 'show' : ''}`}>
        <Link to={`/novel/${novel.slug}`} className="ghost-btn" aria-label="회차 목록">
          ←
        </Link>
        <div className="reader-title-block">
          <p className="reader-novel">{novel.title}</p>
          <h1>{episode.title}</h1>
        </div>
        <button type="button" className="ghost-btn" onClick={() => setSettingsOpen(true)}>
          Aa
        </button>
      </header>

      <main
        className="reader-body"
        onClick={() => setChromeVisible((v) => !v)}
        role="article"
      >
        {loading && <p className="state">불러오는 중…</p>}
        {error && <p className="state error">{error}</p>}
        {!loading && !error && (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        )}
      </main>

      <footer className={`reader-chrome bottom ${chromeVisible ? 'show' : ''}`}>
        <button
          type="button"
          className="nav-ep"
          disabled={!prev}
          onClick={() => prev && navigate(`/novel/${novel.slug}/ep/${prev.id}`)}
        >
          이전 화
        </button>
        <Link to={`/novel/${novel.slug}`} className="nav-ep list">
          목록
        </Link>
        <button
          type="button"
          className="nav-ep"
          disabled={!next}
          onClick={() => next && navigate(`/novel/${novel.slug}/ep/${next.id}`)}
        >
          다음 화
        </button>
      </footer>

      <ReaderSettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
