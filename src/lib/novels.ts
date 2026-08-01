import type { NovelsIndex, Novel } from '../types'
import { getDraft } from './db'

const BASE = import.meta.env.BASE_URL

export function assetUrl(path: string) {
  const clean = path.replace(/^\//, '')
  return `${BASE}${clean}`
}

export async function fetchNovelsIndex(): Promise<NovelsIndex> {
  const res = await fetch(assetUrl('novels/index.json'), { cache: 'no-cache' })
  if (!res.ok) throw new Error('소설 목록을 불러오지 못했습니다.')
  return res.json()
}

export async function fetchEpisodeMarkdown(novel: Novel, file: string): Promise<string> {
  const res = await fetch(assetUrl(`novels/${novel.slug}/${file}`))
  if (!res.ok) throw new Error('회차를 불러오지 못했습니다.')
  return res.text()
}

/** 저장된 원고가 있으면 우선, 없으면 원본 파일 */
export async function fetchEpisodeContent(
  novel: Novel,
  episodeId: string,
  file: string,
): Promise<string> {
  const draft = await getDraft(novel.slug, episodeId)
  if (draft) {
    const safe = draft.title.replace(/"/g, '\\"')
    const body = draft.body.replace(/\s+$/, '') + '\n'
    return `---\ntitle: "${safe}"\n---\n\n${body}`
  }
  return fetchEpisodeMarkdown(novel, file)
}

export function stripFrontmatter(raw: string): string {
  if (!raw.startsWith('---')) return raw
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return raw
  return raw.slice(end + 4).replace(/^\r?\n/, '')
}
