import { zipSync, strToU8 } from 'fflate'
import type { Episode, Novel } from '../types'
import { getDraft, listDrafts } from './db'
import { fetchEpisodeMarkdown, stripFrontmatter } from './novels'

export function parseFrontmatterTitle(raw: string): string | null {
  if (!raw.startsWith('---')) return null
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return null
  const block = raw.slice(3, end)
  const m = block.match(/^title\s*:\s*(.*)$/m)
  if (!m) return null
  return m[1].replace(/^["']|["']$/g, '').trim()
}

export function toExportMarkdown(title: string, body: string): string {
  const safe = title.replace(/"/g, '\\"')
  const cleaned = body.replace(/\s+$/, '') + '\n'
  return `---\ntitle: "${safe}"\n---\n\n${cleaned}`
}

export function filenameForEpisode(ep: Episode, title?: string): string {
  const base = title || ep.title
  const slug = base
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 40)
  return `${String(ep.number).padStart(3, '0')}_${slug || ep.id}.md`
}

export async function loadEpisodeEditable(
  novel: Novel,
  episode: Episode,
): Promise<{ title: string; body: string; fromDraft: boolean; updatedAt: number | null }> {
  const draft = await getDraft(novel.slug, episode.id)
  if (draft) {
    return {
      title: draft.title || episode.title,
      body: draft.body,
      fromDraft: true,
      updatedAt: draft.updatedAt,
    }
  }

  const raw = await fetchEpisodeMarkdown(novel, episode.file)
  const title = parseFrontmatterTitle(raw) || episode.title
  return {
    title,
    body: stripFrontmatter(raw),
    fromDraft: false,
    updatedAt: null,
  }
}

export async function loadOriginalEpisode(
  novel: Novel,
  episode: Episode,
): Promise<{ title: string; body: string }> {
  const raw = await fetchEpisodeMarkdown(novel, episode.file)
  return {
    title: parseFrontmatterTitle(raw) || episode.title,
    body: stripFrontmatter(raw),
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function exportEpisodesAsMarkdown(
  novel: Novel,
  episodes: Episode[],
): Promise<{ count: number; mode: 'file' | 'zip' }> {
  const files: { name: string; content: string }[] = []

  for (const ep of episodes) {
    const editable = await loadEpisodeEditable(novel, ep)
    const md = toExportMarkdown(editable.title, editable.body)
    files.push({ name: filenameForEpisode(ep, editable.title), content: md })
  }

  if (files.length === 1) {
    const f = files[0]
    triggerDownload(new Blob([f.content], { type: 'text/markdown;charset=utf-8' }), f.name)
    return { count: 1, mode: 'file' }
  }

  const zipInput: Record<string, Uint8Array> = {}
  for (const f of files) {
    zipInput[f.name] = strToU8(f.content)
  }
  const zipped = zipSync(zipInput, { level: 6 })
  const stamp = new Date().toISOString().slice(0, 10)
  triggerDownload(
    new Blob([new Uint8Array(zipped)], { type: 'application/zip' }),
    `${novel.slug}_episodes_${stamp}.zip`,
  )
  return { count: files.length, mode: 'zip' }
}

/** 각색(수정) 원고만 내보내기 */
export async function exportDraftEpisodesAsMarkdown(
  novel: Novel,
  episodeIds: string[],
): Promise<{ count: number; mode: 'file' | 'zip' }> {
  const drafts = await listDrafts(novel.slug)
  const wanted = new Set(episodeIds)
  const files: { name: string; content: string }[] = []

  for (const ep of novel.episodes) {
    if (!wanted.has(ep.id)) continue
    const draft = drafts.find((d) => d.episodeId === ep.id)
    if (!draft) continue
    const md = toExportMarkdown(draft.title, draft.body)
    files.push({
      name: filenameForEpisode(ep, draft.title).replace(/\.md$/, '_각색.md'),
      content: md,
    })
  }

  if (files.length === 0) throw new Error('내보낼 각색 원고가 없습니다.')

  if (files.length === 1) {
    const f = files[0]
    triggerDownload(new Blob([f.content], { type: 'text/markdown;charset=utf-8' }), f.name)
    return { count: 1, mode: 'file' }
  }

  const zipInput: Record<string, Uint8Array> = {}
  for (const f of files) zipInput[f.name] = strToU8(f.content)
  const zipped = zipSync(zipInput, { level: 6 })
  const stamp = new Date().toISOString().slice(0, 10)
  triggerDownload(
    new Blob([new Uint8Array(zipped)], { type: 'application/zip' }),
    `${novel.slug}_각색_${stamp}.zip`,
  )
  return { count: files.length, mode: 'zip' }
}
