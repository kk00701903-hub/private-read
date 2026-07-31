import { Link } from 'react-router-dom'
import type { Novel } from '../types'
import { assetUrl } from '../lib/novels'

type Props = {
  novel: Novel
  continueEpisodeId?: string
}

export function NovelCard({ novel, continueEpisodeId }: Props) {
  return (
    <Link to={`/novel/${novel.slug}`} className="novel-card">
      <div className="novel-cover" aria-hidden>
        {novel.cover ? (
          <img src={assetUrl(novel.cover)} alt="" loading="lazy" />
        ) : (
          <div className="novel-cover-fallback">
            <span>{novel.title.slice(0, 1)}</span>
          </div>
        )}
      </div>
      <div className="novel-meta">
        <h2>{novel.title}</h2>
        <p className="novel-author">{novel.author}</p>
        <p className="novel-desc">{novel.description}</p>
        <div className="novel-tags">
          {novel.genre && <span>{novel.genre}</span>}
          <span>{novel.status}</span>
          <span>{novel.episodeCount}화</span>
          {continueEpisodeId && <span className="tag-continue">이어보기</span>}
        </div>
      </div>
    </Link>
  )
}
