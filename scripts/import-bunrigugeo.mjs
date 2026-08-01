import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

const root = join(process.cwd())
const slug = 'bunrigugeo'
const outDir = join(root, 'public', 'novels', slug)
const novelsRoot = join(root, 'public', 'novels')

// 기본: _tmp/new 안의 첫 폴더 또는 _tmp/s1+s2
function resolveSources() {
  const newRoot = join(root, '_tmp', 'new')
  try {
    const entries = readdirSync(newRoot, { withFileTypes: true })
    const dirs = entries.filter((d) => d.isDirectory()).map((d) => join(newRoot, d.name))
    const filesHere = entries.filter((d) => d.isFile() && d.name.endsWith('.md'))
    if (dirs.length) return dirs
    if (filesHere.length) return [newRoot]
  } catch {
    /* fall through */
  }
  return [join(root, '_tmp', 's1'), join(root, '_tmp', 's2')]
}

function episodeNum(name) {
  const m = name.match(/ep(\d+)/i)
  return m ? Number(m[1]) : null
}

function stripMdTitle(raw) {
  return raw.replace(/^#\s*.+\r?\n+/, '')
}

function titleFromContent(raw, fallback) {
  const m = raw.match(/^#\s*(?:\d+화\s*[:：]\s*)?(.+)\s*$/m)
  if (m) return m[1].trim()
  return fallback
}

function titleFromFilename(name) {
  const base = basename(name, '.md')
  const m = base.match(/ep\d+_(.+)$/i)
  return m ? m[1] : base
}

// 기존 novels 전부 제거 후 재생성
for (const name of readdirSync(novelsRoot)) {
  if (name === 'index.json') continue
  const full = join(novelsRoot, name)
  if (statSync(full).isDirectory()) rmSync(full, { recursive: true, force: true })
}

mkdirSync(outDir, { recursive: true })

const sources = resolveSources()
const files = []
for (const dir of sources) {
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.md')) continue
    if (name.includes('목차') || name.startsWith('00_')) continue
    const n = episodeNum(name)
    if (n == null) continue
    files.push({ n, path: join(dir, name), name })
  }
}

files.sort((a, b) => a.n - b.n || a.name.localeCompare(b.name, 'ko'))

const seen = new Set()
let count = 0
for (const f of files) {
  if (seen.has(f.n)) {
    console.warn(`skip duplicate ep${f.n}: ${f.name}`)
    continue
  }
  seen.add(f.n)
  const raw = readFileSync(f.path, 'utf8')
  const title = titleFromContent(raw, titleFromFilename(f.name))
  const body = stripMdTitle(raw).replace(/^\uFEFF/, '').trimEnd() + '\n'
  const outName = String(f.n).padStart(3, '0') + '.md'
  const fmTitle = `${f.n}화 — ${title}`.replace(/"/g, '\\"')
  const content = `---\ntitle: "${fmTitle}"\n---\n\n${body}`
  writeFileSync(join(outDir, outName), content, 'utf8')
  count++
  console.log(`${outName}  ${f.n}화 — ${title}`)
}

const meta = {
  title: '딸내미를 건드린 조폭들을 분리수거 중임니다.',
  author: '작자 미상',
  description: '시즌1·시즌2 전 회차. 딸을 건드린 조폭들을 분리수거하는 이야기. (증량 퇴고본)',
  genre: '액션',
  status: '연재중',
  updatedAt: new Date().toISOString().slice(0, 10),
}

writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8')
console.log(`\n✓ ${count}화 등록 → public/novels/${slug}/`)
