import { Link, useParams } from 'react-router-dom'
import { useNovels } from '../hooks/useNovels'
import { useReadingProgress } from '../hooks/useReader'
import { assetUrl } from '../lib/novels'

export function NovelPage() {
  const { slug = '' } = useParams()
  const { getNovel, loading, error } = useNovels()
  const { progress } = useReadingProgress()
  const novel = getNovel(slug)
  const lastId = progress[slug]?.episodeId
  const continueEp = novel?.episodes.find((e) => e.id === lastId) ?? novel?.episodes[0]

  if (loading) return <p className="state page">불러오는 중…</p>
  if (error) return <p className="state error page">{error}</p>
  if (!novel) return <p className="state error page">작품을 찾을 수 없습니다.</p>

  return (
    <div className="page novel-page">
      <Link to="/" className="back-link">
        ← 홈
      </Link>

      <header className="novel-detail-head">
        <div className="novel-cover large" aria-hidden>
          {novel.cover ? (
            <img src={assetUrl(novel.cover)} alt="" />
          ) : (
            <div className="novel-cover-fallback">
              <span>{novel.title.slice(0, 1)}</span>
            </div>
          )}
        </div>
        <div>
          <p className="novel-author">{novel.author}</p>
          <h1>{novel.title}</h1>
          <p className="novel-desc">{novel.description}</p>
          <div className="novel-tags">
            {novel.genre && <span>{novel.genre}</span>}
            <span>{novel.status}</span>
            <span>{novel.episodeCount}화</span>
          </div>
          {continueEp && (
            <Link className="primary-btn" to={`/novel/${novel.slug}/ep/${continueEp.id}`}>
              {lastId ? '이어보기' : '첫 화부터'}
            </Link>
          )}
        </div>
      </header>

      <section className="episode-list" aria-label="회차 목록">
        <h2>회차</h2>
        <ul>
          {novel.episodes.map((ep) => (
            <li key={ep.id}>
              <Link
                to={`/novel/${novel.slug}/ep/${ep.id}`}
                className={lastId === ep.id ? 'is-current' : undefined}
              >
                <span className="ep-num">{ep.number}화</span>
                <span className="ep-title">{ep.title}</span>
                <span className="ep-words">{ep.wordCount.toLocaleString('ko-KR')}자</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
