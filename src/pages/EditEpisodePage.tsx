import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNovels } from '../hooks/useNovels'
import { deleteDraft, flushDb, upsertDraft } from '../lib/db'
import { buildChangeSummary, buildTitleChangeSummary, mergeSummaries } from '../lib/diffSummary'
import { loadEpisodeEditable, loadOriginalEpisode } from '../lib/manuscript'

type Mode = 'read' | 'edit'

export function EditEpisodePage() {
  const { slug = '', episodeId = '' } = useParams()
  const navigate = useNavigate()
  const { getNovel, loading: novelsLoading } = useNovels()
  const novel = getNovel(slug)
  const episode = novel?.episodes.find((e) => e.id === episodeId)

  const [mode, setMode] = useState<Mode>('read')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [originalTitle, setOriginalTitle] = useState('')
  const [originalBody, setOriginalBody] = useState('')
  const [fromDraft, setFromDraft] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!novel || !episode) return
    let alive = true
    setLoading(true)
    setError(null)
    setStatus(null)
    setMode('read')
    Promise.all([loadEpisodeEditable(novel, episode), loadOriginalEpisode(novel, episode)])
      .then(([data, original]) => {
        if (!alive) return
        setTitle(data.title)
        setBody(data.body)
        setOriginalTitle(original.title)
        setOriginalBody(original.body)
        setFromDraft(data.fromDraft)
        setUpdatedAt(data.updatedAt)
        setDirty(false)
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
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const enterEdit = () => {
    if (mode === 'edit') return
    setMode('edit')
    setStatus(null)
  }

  const onSave = async () => {
    if (!novel || !episode) return
    setSaving(true)
    setStatus(null)
    try {
      const nextTitle = title.trim() || episode.title
      const summary = mergeSummaries(
        buildTitleChangeSummary(originalTitle, nextTitle),
        buildChangeSummary(originalBody, body),
      )
      const row = await upsertDraft({
        novelSlug: novel.slug,
        episodeId: episode.id,
        title: nextTitle,
        body,
        changeSummary: summary,
      })
      await flushDb()
      setFromDraft(true)
      setUpdatedAt(row.updatedAt)
      setDirty(false)
      setMode('read')
      setStatus('저장했습니다. 읽기 모드로 전환합니다.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const onReset = async () => {
    if (!novel || !episode) return
    if (!confirm('이 화의 각색 원고를 삭제하고 원본으로 되돌릴까요?')) return
    await deleteDraft(novel.slug, episode.id)
    await flushDb()
    const data = await loadEpisodeEditable(novel, episode)
    setTitle(data.title)
    setBody(data.body)
    setFromDraft(false)
    setUpdatedAt(null)
    setDirty(false)
    setMode('read')
    setStatus('원본으로 되돌렸습니다.')
  }

  if (novelsLoading || loading) return <p className="state page">불러오는 중…</p>
  if (!novel || !episode) {
    return (
      <p className="state error page">
        회차를 찾을 수 없습니다. <Link to="/edit">목록으로</Link>
      </p>
    )
  }

  const epIndex = novel.episodes.findIndex((e) => e.id === episode.id)
  const prev = epIndex > 0 ? novel.episodes[epIndex - 1] : null
  const next =
    epIndex >= 0 && epIndex < novel.episodes.length - 1 ? novel.episodes[epIndex + 1] : null

  const go = (id: string) => {
    if (dirty && !confirm('저장하지 않은 내용이 있습니다. 이동할까요?')) return
    navigate(`/edit/${novel.slug}/${id}`)
  }

  return (
    <div className={`page editor-page mode-${mode}`}>
      <header className="editor-top">
        <Link to={`/edit/${novel.slug}`} className="back-link">
          ← 목록
        </Link>
        <div className="editor-actions">
          {mode === 'edit' ? (
            <>
              {fromDraft && (
                <button type="button" className="ghost-btn" onClick={() => void onReset()}>
                  원본 복원
                </button>
              )}
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  if (dirty && !confirm('저장하지 않은 내용이 있습니다. 읽기 모드로 돌아갈까요?')) {
                    return
                  }
                  setMode('read')
                }}
              >
                읽기
              </button>
              <button
                type="button"
                className="primary-btn install-btn compact"
                disabled={saving || !dirty}
                onClick={() => void onSave()}
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="ghost-btn" onClick={enterEdit}>
                편집
              </button>
              <Link
                className="primary-btn install-btn compact"
                to={`/novel/${novel.slug}/ep/${episode.id}`}
              >
                뷰어로
              </Link>
            </>
          )}
        </div>
      </header>

      <p className="editor-meta">
        {episode.number}화 · {mode === 'edit' ? '편집 모드' : '읽기 모드'}
        {fromDraft ? ' · 각색' : ' · 원본'}
        {updatedAt ? ` · ${new Date(updatedAt).toLocaleString('ko-KR')}` : ''}
        {dirty ? ' · 미저장' : ''}
      </p>
      {mode === 'read' && (
        <p className="editor-hint">화면을 누르면 편집 모드로 전환됩니다.</p>
      )}

      {error && <p className="state error">{error}</p>}
      {status && <p className="export-msg">{status}</p>}

      {mode === 'edit' ? (
        <>
          <label className="editor-field">
            <span>제목</span>
            <input
              type="text"
              value={title}
              autoFocus
              onChange={(e) => {
                setTitle(e.target.value)
                setDirty(true)
                setStatus(null)
              }}
            />
          </label>
          <label className="editor-field grow">
            <span>본문 (Markdown)</span>
            <textarea
              value={body}
              spellCheck={false}
              onChange={(e) => {
                setBody(e.target.value)
                setDirty(true)
                setStatus(null)
              }}
            />
          </label>
        </>
      ) : (
        <article
          className="editor-read-body"
          onClick={enterEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') enterEdit()
          }}
          role="button"
          tabIndex={0}
          aria-label="눌러서 편집"
        >
          <h1 className="editor-read-title">{title}</h1>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </article>
      )}

      <div className="editor-nav">
        <button type="button" className="nav-ep" disabled={!prev} onClick={() => prev && go(prev.id)}>
          이전 화
        </button>
        <button type="button" className="nav-ep" disabled={!next} onClick={() => next && go(next.id)}>
          다음 화
        </button>
      </div>
    </div>
  )
}
