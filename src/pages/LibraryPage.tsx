import { Link } from 'react-router-dom'
import { useNovels } from '../hooks/useNovels'
import { useReadingProgress } from '../hooks/useReader'
import { NovelCard } from '../components/NovelCard'

export function LibraryPage() {
  const { data, loading, error } = useNovels()
  const { progress } = useReadingProgress()

  const continued =
    data?.novels
      .filter((n) => progress[n.slug])
      .sort((a, b) => (progress[b.slug]?.updatedAt ?? 0) - (progress[a.slug]?.updatedAt ?? 0)) ?? []

  return (
    <div className="page">
      <header className="page-head">
        <h1>보관함</h1>
        <p className="lede">최근에 읽은 작품</p>
      </header>

      {loading && <p className="state">불러오는 중…</p>}
      {error && <p className="state error">{error}</p>}

      {!loading && continued.length === 0 && (
        <p className="state">
          아직 읽은 작품이 없습니다.
          <br />
          <Link to="/">홈에서 작품을 골라보세요</Link>
        </p>
      )}

      <section className="novel-list">
        {continued.map((novel) => (
          <NovelCard
            key={novel.slug}
            novel={novel}
            continueEpisodeId={progress[novel.slug]?.episodeId}
          />
        ))}
      </section>
    </div>
  )
}
