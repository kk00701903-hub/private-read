import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useNovels } from '../hooks/useNovels'
import { deleteDraft, flushDb, upsertDraft } from '../lib/db'
import { loadEpisodeEditable } from '../lib/manuscript'

export function EditEpisodePage() {
  const { slug = '', episodeId = '' } = useParams()
  const navigate = useNavigate()
  const { getNovel, loading: novelsLoading } = useNovels()
  const novel = getNovel(slug)
  const episode = novel?.episodes.find((e) => e.id === episodeId)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
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
    loadEpisodeEditable(novel, episode)
      .then((data) => {
        if (!alive) return
        setTitle(data.title)
        setBody(data.body)
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

  const onSave = async () => {
    if (!novel || !episode) return
    setSaving(true)
    setStatus(null)
    try {
      const row = await upsertDraft({
        novelSlug: novel.slug,
        episodeId: episode.id,
        title: title.trim() || episode.title,
        body,
      })
      await flushDb()
      setFromDraft(true)
      setUpdatedAt(row.updatedAt)
      setDirty(false)
      setStatus('저장했습니다.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const onReset = async () => {
    if (!novel || !episode) return
    if (!confirm('이 화의 수정본을 삭제하고 원본으로 되돌릴까요?')) return
    await deleteDraft(novel.slug, episode.id)
    await flushDb()
    const data = await loadEpisodeEditable(novel, episode)
    setTitle(data.title)
    setBody(data.body)
    setFromDraft(false)
    setUpdatedAt(null)
    setDirty(false)
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
    <div className="page editor-page">
      <header className="editor-top">
        <Link to={`/edit/${novel.slug}`} className="back-link">
          ← 목록
        </Link>
        <div className="editor-actions">
          {fromDraft && (
            <button type="button" className="ghost-btn" onClick={() => void onReset()}>
              원본 복원
            </button>
          )}
          <button
            type="button"
            className="primary-btn install-btn compact"
            disabled={saving || !dirty}
            onClick={() => void onSave()}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </header>

      <p className="editor-meta">
        {episode.number}화 · {fromDraft ? '수정본' : '원본'}
        {updatedAt ? ` · ${new Date(updatedAt).toLocaleString('ko-KR')}` : ''}
        {dirty ? ' · 미저장' : ''}
      </p>

      {error && <p className="state error">{error}</p>}
      {status && <p className="export-msg">{status}</p>}

      <label className="editor-field">
        <span>제목</span>
        <input
          type="text"
          value={title}
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
