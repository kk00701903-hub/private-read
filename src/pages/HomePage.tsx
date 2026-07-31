import { Link } from 'react-router-dom'
import { NovelCard } from '../components/NovelCard'
import { useNovels } from '../hooks/useNovels'
import { useReadingProgress } from '../hooks/useReader'

export function HomePage() {
  const { data, error, loading } = useNovels()
  const { progress } = useReadingProgress()

  return (
    <div className="page home-page">
      <header className="page-hero">
        <p className="brand">리드</p>
        <h1>오늘의 이야기</h1>
        <p className="lede">회차 MD를 등록하면 바로 읽을 수 있어요.</p>
      </header>

      {loading && <p className="state">불러오는 중…</p>}
      {error && (
        <p className="state error">
          {error}
          <br />
          <small>
            <code>npm run generate</code> 후 다시 시도하세요.
          </small>
        </p>
      )}

      {data && (
        <section className="novel-list" aria-label="작품 목록">
          {data.novels.map((novel) => (
            <NovelCard
              key={novel.slug}
              novel={novel}
              continueEpisodeId={progress[novel.slug]?.episodeId}
            />
          ))}
          {data.novels.length === 0 && (
            <p className="state">
              등록된 작품이 없습니다.
              <br />
              <Link to="/settings">등록 방법 보기</Link>
            </p>
          )}
        </section>
      )}
    </div>
  )
}
