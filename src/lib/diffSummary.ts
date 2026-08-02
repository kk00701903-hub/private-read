/** 편집된 줄만 골라 기존 → 변경 요약 생성 */
export function buildChangeSummary(original: string, edited: string, max = 6): string {
  const norm = (s: string) => s.replace(/\r\n/g, '\n').trim()
  const before = norm(original)
  const after = norm(edited)
  if (before === after) return '본문 변경 없음'

  const oLines = before
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const eLines = after
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const oSet = new Set(oLines)
  const eSet = new Set(eLines)
  const removed = oLines.filter((l) => !eSet.has(l))
  const added = eLines.filter((l) => !oSet.has(l))

  const clip = (s: string) => (s.length > 72 ? `${s.slice(0, 72)}…` : s)
  const parts: string[] = []
  const n = Math.max(removed.length, added.length)

  for (let i = 0; i < n && parts.length < max; i++) {
    const old = removed[i]
    const neu = added[i]
    if (old && neu) parts.push(`기존: ${clip(old)}\n→ 변경: ${clip(neu)}`)
    else if (old) parts.push(`기존: ${clip(old)}\n→ 변경: (삭제됨)`)
    else if (neu) parts.push(`기존: (없음)\n→ 변경: ${clip(neu)}`)
  }

  if (parts.length === 0) {
    if (before.length !== after.length) return '문장 길이·띄어쓰기 등이 다듬어졌습니다.'
    return '세부 표현이 수정되었습니다.'
  }

  const leftover = Math.max(0, n - parts.length)
  return parts.join('\n\n') + (leftover > 0 ? `\n\n외 ${leftover}곳` : '')
}

export function buildTitleChangeSummary(originalTitle: string, editedTitle: string): string | null {
  const a = originalTitle.trim()
  const b = editedTitle.trim()
  if (!a || !b || a === b) return null
  const clip = (s: string) => (s.length > 40 ? `${s.slice(0, 40)}…` : s)
  return `제목 기존: ${clip(a)}\n→ 변경: ${clip(b)}`
}

export function mergeSummaries(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join('\n\n')
}
