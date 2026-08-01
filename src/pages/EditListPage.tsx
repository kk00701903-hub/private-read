import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useNovels } from '../hooks/useNovels'
import { listDraftMeta } from '../lib/db'
import { exportEpisodesAsMarkdown } from '../lib/manuscript'

export function EditListPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { data, getNovel, loading, error } = useNovels()
  const novel = slug ? getNovel(slug) : data?.novels[0]
  const [draftMeta, setDraftMeta] = useState<Record<string, { title: string; updatedAt: number }>>(
    {},
  )
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!slug && data?.novels[0]) {
      navigate(`/edit/${data.novels[0].slug}`, { replace: true })
    }
  }, [slug, data, navigate])

  useEffect(() => {
    if (!novel) return
    let alive = true
    listDraftMeta(novel.slug)
      .then((meta) => {
        if (alive) setDraftMeta(meta)
      })
      .catch(console.error)
    return () => {
      alive = false
    }
  }, [novel])

  const allIds = useMemo(() => novel?.episodes.map((e) => e.id) ?? [], [novel])
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(allIds))
  }

  const onExport = async () => {
    if (!novel || selected.size === 0) return
    setExporting(true)
    setMessage(null)
    try {
      const eps = novel.episodes.filter((e) => selected.has(e.id))
      const result = await exportEpisodesAsMarkdown(novel, eps)
      setMessage(
        result.mode === 'zip'
          ? `${result.count}화를 ZIP으로 내보냈습니다.`
          : `1화를 MD로 내보냈습니다.`,
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '내보내기에 실패했습니다.')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <p className="state page">불러오는 중…</p>
  if (error) return <p className="state error page">{error}</p>
  if (!novel) return <p className="state page">등록된 작품이 없습니다.</p>

  return (
    <div className="page edit-list-page">
      <header className="page-head">
        <h1>원고 편집</h1>
        <p className="lede">{novel.title} · 수정 후 저장 · MD 내보내기</p>
      </header>

      {(data?.novels.length ?? 0) > 1 && (
        <label className="novel-picker">
          <span>작품</span>
          <select
            value={novel.slug}
            onChange={(e) => navigate(`/edit/${e.target.value}`)}
          >
            {data!.novels.map((n) => (
              <option key={n.slug} value={n.slug}>
                {n.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="edit-toolbar">
        <label className="check-all">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
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

      <ul className="edit-episode-list">
        {novel.episodes.map((ep) => {
          const saved = draftMeta[ep.id]
          return (
            <li key={ep.id} className={saved ? 'has-draft' : undefined}>
              <label className="edit-check">
                <input
                  type="checkbox"
                  checked={selected.has(ep.id)}
                  onChange={() => toggle(ep.id)}
                />
              </label>
              <Link to={`/edit/${novel.slug}/${ep.id}`} className="edit-ep-link">
                <span className="ep-num">{ep.number}화</span>
                <span className="ep-title">{saved?.title || ep.title}</span>
                <span className="ep-badge">
                  {saved ? '수정됨' : '원본'}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
