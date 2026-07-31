import { readdir, readFile, writeFile, stat } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const novelsRoot = join(__dirname, '..', 'public', 'novels')
const outPath = join(novelsRoot, 'index.json')

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { meta: {}, body: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { meta: {}, body: raw }
  const block = raw.slice(3, end).trim()
  const body = raw.slice(end + 4).replace(/^\r?\n/, '')
  const meta = {}
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^(\w+)\s*:\s*(.*)$/)
    if (m) meta[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
  }
  return { meta, body }
}

function episodeSortKey(name) {
  const n = name.match(/^(\d+)/)
  return n ? Number(n[1]) : Infinity
}

async function loadNovel(slug) {
  const dir = join(novelsRoot, slug)
  const metaPath = join(dir, 'meta.json')
  let meta
  try {
    meta = JSON.parse(await readFile(metaPath, 'utf8'))
  } catch {
    console.warn(`[skip] ${slug}: meta.json 없음`)
    return null
  }

  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.md'))
    .sort((a, b) => episodeSortKey(a) - episodeSortKey(b) || a.localeCompare(b))

  const episodes = []
  for (const file of files) {
    const raw = await readFile(join(dir, file), 'utf8')
    const { meta: fm, body } = parseFrontmatter(raw)
    const numMatch = file.match(/^(\d+)/)
    const number = numMatch ? Number(numMatch[1]) : episodes.length + 1
    const firstLine = body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith('#'))
    const title =
      fm.title ||
      (body.match(/^#\s+(.+)$/m)?.[1]?.trim()) ||
      firstLine?.slice(0, 40) ||
      `${number}화`

    episodes.push({
      id: basename(file, '.md'),
      file,
      number,
      title,
      wordCount: body.replace(/\s+/g, '').length,
    })
  }

  return {
    slug,
    title: meta.title || slug,
    author: meta.author || '작자 미상',
    description: meta.description || '',
    cover: meta.cover ? `novels/${slug}/${meta.cover}` : null,
    genre: meta.genre || '',
    status: meta.status || '연재중',
    updatedAt: meta.updatedAt || null,
    episodeCount: episodes.length,
    episodes,
  }
}

async function main() {
  let entries = []
  try {
    entries = await readdir(novelsRoot)
  } catch {
    console.error('public/novels 폴더가 없습니다.')
    process.exit(1)
  }

  const novels = []
  for (const name of entries) {
    if (name === 'index.json') continue
    const full = join(novelsRoot, name)
    const s = await stat(full)
    if (!s.isDirectory()) continue
    const novel = await loadNovel(name)
    if (novel) novels.push(novel)
  }

  novels.sort((a, b) => a.title.localeCompare(b.title, 'ko'))

  const index = {
    generatedAt: new Date().toISOString(),
    novels: novels.map(({ episodes, ...rest }) => ({
      ...rest,
      // keep light episode summary in index
      episodes: episodes.map(({ id, file, number, title, wordCount }) => ({
        id,
        file,
        number,
        title,
        wordCount,
      })),
    })),
  }

  await writeFile(outPath, JSON.stringify(index, null, 2), 'utf8')
  console.log(`✓ ${novels.length}편 → public/novels/index.json`)
  for (const n of novels) {
    console.log(`  - ${n.title} (${n.episodeCount}화)`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
