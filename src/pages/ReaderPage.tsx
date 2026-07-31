import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNovels } from '../hooks/useNovels'
import { useReaderSettings, useReadingProgress } from '../hooks/useReader'
import { fetchEpisodeMarkdown, stripFrontmatter } from '../lib/novels'
import { ReaderSettingsPanel } from '../components/ReaderSettingsPanel'

export function ReaderPage() {
  const { slug = '', episodeId = '' } = useParams()
  const navigate = useNavigate()
  const { getNovel, loading: novelsLoading } = useNovels()
  const novel = getNovel(slug)
  const { settings, setSettings } = useReaderSettings()
  const { saveProgress } = useReadingProgress()
  const [raw, setRaw] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

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
    fetchEpisodeMarkdown(novel, episode.file)
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

  useEffect(() => {
    if (novel && episode) saveProgress(novel.slug, episode.id)
  }, [novel, episode, saveProgress])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [episodeId])

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
