import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const IDB_NAME = 'read-pwa-sqlite'
const IDB_STORE = 'files'
const IDB_KEY = 'progress.sqlite'
const LEGACY_KEY = 'read-pwa:progress'

export type ReadingProgressRow = {
  novelSlug: string
  episodeId: string
  scrollY: number
  scrollRatio: number
  updatedAt: number
}

let sqlPromise: Promise<SqlJsStatic> | null = null
let dbPromise: Promise<Database> | null = null
let persistTimer: ReturnType<typeof setTimeout> | null = null

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function loadBytes(): Promise<Uint8Array | null> {
  const idb = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
    req.onsuccess = () => {
      const v = req.result
      resolve(v instanceof Uint8Array ? v : null)
    }
    req.onerror = () => reject(req.error)
  })
}

async function saveBytes(bytes: Uint8Array): Promise<void> {
  const idb = await openIdb()
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(bytes, IDB_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: () => wasmUrl })
  }
  return sqlPromise
}

function ensureSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS reading_progress (
      novel_slug TEXT PRIMARY KEY,
      episode_id TEXT NOT NULL,
      scroll_y REAL NOT NULL DEFAULT 0,
      scroll_ratio REAL NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS episode_drafts (
      novel_slug TEXT NOT NULL,
      episode_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (novel_slug, episode_id)
    );
  `)
}

function schedulePersist(db: Database) {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    void saveBytes(db.export()).catch((err) => {
      console.error('[sqlite] persist failed', err)
    })
  }, 250)
}

function migrateFromLocalStorage(db: Database) {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, { episodeId: string; updatedAt: number }>
    const upsert = db.prepare(`
      INSERT INTO reading_progress (novel_slug, episode_id, scroll_y, scroll_ratio, updated_at)
      VALUES (?, ?, 0, 0, ?)
      ON CONFLICT(novel_slug) DO UPDATE SET
        episode_id=excluded.episode_id,
        updated_at=excluded.updated_at
      WHERE excluded.updated_at >= reading_progress.updated_at
    `)
    for (const [slug, row] of Object.entries(parsed)) {
      if (!row?.episodeId) continue
      upsert.run([slug, row.episodeId, row.updatedAt || Date.now()])
    }
    upsert.free()
    localStorage.removeItem(LEGACY_KEY)
    schedulePersist(db)
  } catch (err) {
    console.warn('[sqlite] legacy migrate skipped', err)
  }
}

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await getSql()
      const bytes = await loadBytes()
      const db = bytes ? new SQL.Database(bytes) : new SQL.Database()
      ensureSchema(db)
      migrateFromLocalStorage(db)
      return db
    })()
  }
  return dbPromise
}

export async function listProgress(): Promise<ReadingProgressRow[]> {
  const db = await getDb()
  const stmt = db.prepare(`
    SELECT novel_slug, episode_id, scroll_y, scroll_ratio, updated_at
    FROM reading_progress
    ORDER BY updated_at DESC
  `)
  const rows: ReadingProgressRow[] = []
  while (stmt.step()) {
    const r = stmt.getAsObject() as Record<string, unknown>
    rows.push({
      novelSlug: String(r.novel_slug),
      episodeId: String(r.episode_id),
      scrollY: Number(r.scroll_y) || 0,
      scrollRatio: Number(r.scroll_ratio) || 0,
      updatedAt: Number(r.updated_at) || 0,
    })
  }
  stmt.free()
  return rows
}

export async function getProgress(novelSlug: string): Promise<ReadingProgressRow | null> {
  const db = await getDb()
  const stmt = db.prepare(`
    SELECT novel_slug, episode_id, scroll_y, scroll_ratio, updated_at
    FROM reading_progress
    WHERE novel_slug = ?
  `)
  stmt.bind([novelSlug])
  const row = stmt.step() ? (stmt.getAsObject() as Record<string, unknown>) : null
  stmt.free()
  if (!row) return null
  return {
    novelSlug: String(row.novel_slug),
    episodeId: String(row.episode_id),
    scrollY: Number(row.scroll_y) || 0,
    scrollRatio: Number(row.scroll_ratio) || 0,
    updatedAt: Number(row.updated_at) || 0,
  }
}

export async function upsertProgress(input: {
  novelSlug: string
  episodeId: string
  scrollY?: number
  scrollRatio?: number
}): Promise<ReadingProgressRow> {
  const db = await getDb()
  const updatedAt = Date.now()
  const scrollY = input.scrollY ?? 0
  const scrollRatio = input.scrollRatio ?? 0
  db.run(
    `
    INSERT INTO reading_progress (novel_slug, episode_id, scroll_y, scroll_ratio, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(novel_slug) DO UPDATE SET
      episode_id=excluded.episode_id,
      scroll_y=excluded.scroll_y,
      scroll_ratio=excluded.scroll_ratio,
      updated_at=excluded.updated_at
  `,
    [input.novelSlug, input.episodeId, scrollY, scrollRatio, updatedAt],
  )
  schedulePersist(db)
  return {
    novelSlug: input.novelSlug,
    episodeId: input.episodeId,
    scrollY,
    scrollRatio,
    updatedAt,
  }
}

export async function flushDb(): Promise<void> {
  const db = await getDb()
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  await saveBytes(db.export())
}

export type EpisodeDraftRow = {
  novelSlug: string
  episodeId: string
  title: string
  body: string
  updatedAt: number
}

export async function getDraft(
  novelSlug: string,
  episodeId: string,
): Promise<EpisodeDraftRow | null> {
  const db = await getDb()
  const stmt = db.prepare(`
    SELECT novel_slug, episode_id, title, body, updated_at
    FROM episode_drafts
    WHERE novel_slug = ? AND episode_id = ?
  `)
  stmt.bind([novelSlug, episodeId])
  const row = stmt.step() ? (stmt.getAsObject() as Record<string, unknown>) : null
  stmt.free()
  if (!row) return null
  return {
    novelSlug: String(row.novel_slug),
    episodeId: String(row.episode_id),
    title: String(row.title ?? ''),
    body: String(row.body ?? ''),
    updatedAt: Number(row.updated_at) || 0,
  }
}

export async function listDrafts(novelSlug: string): Promise<EpisodeDraftRow[]> {
  const db = await getDb()
  const stmt = db.prepare(`
    SELECT novel_slug, episode_id, title, body, updated_at
    FROM episode_drafts
    WHERE novel_slug = ?
    ORDER BY episode_id ASC
  `)
  stmt.bind([novelSlug])
  const rows: EpisodeDraftRow[] = []
  while (stmt.step()) {
    const r = stmt.getAsObject() as Record<string, unknown>
    rows.push({
      novelSlug: String(r.novel_slug),
      episodeId: String(r.episode_id),
      title: String(r.title ?? ''),
      body: String(r.body ?? ''),
      updatedAt: Number(r.updated_at) || 0,
    })
  }
  stmt.free()
  return rows
}

export async function listDraftMeta(
  novelSlug: string,
): Promise<Record<string, { title: string; updatedAt: number }>> {
  const db = await getDb()
  const stmt = db.prepare(`
    SELECT episode_id, title, updated_at
    FROM episode_drafts
    WHERE novel_slug = ?
  `)
  stmt.bind([novelSlug])
  const map: Record<string, { title: string; updatedAt: number }> = {}
  while (stmt.step()) {
    const r = stmt.getAsObject() as Record<string, unknown>
    map[String(r.episode_id)] = {
      title: String(r.title ?? ''),
      updatedAt: Number(r.updated_at) || 0,
    }
  }
  stmt.free()
  return map
}

export async function upsertDraft(input: {
  novelSlug: string
  episodeId: string
  title: string
  body: string
}): Promise<EpisodeDraftRow> {
  const db = await getDb()
  const updatedAt = Date.now()
  db.run(
    `
    INSERT INTO episode_drafts (novel_slug, episode_id, title, body, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(novel_slug, episode_id) DO UPDATE SET
      title=excluded.title,
      body=excluded.body,
      updated_at=excluded.updated_at
  `,
    [input.novelSlug, input.episodeId, input.title, input.body, updatedAt],
  )
  schedulePersist(db)
  return {
    novelSlug: input.novelSlug,
    episodeId: input.episodeId,
    title: input.title,
    body: input.body,
    updatedAt,
  }
}

export async function deleteDraft(novelSlug: string, episodeId: string): Promise<void> {
  const db = await getDb()
  db.run(`DELETE FROM episode_drafts WHERE novel_slug = ? AND episode_id = ?`, [
    novelSlug,
    episodeId,
  ])
  schedulePersist(db)
}
