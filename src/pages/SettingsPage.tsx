import { useState } from 'react'
import { InstallPwa } from '../components/InstallPwa'
import { useReaderSettings } from '../hooks/useReader'
import { clearManuscriptCache } from '../lib/clearCache'
import { deleteAllDrafts } from '../lib/db'

export function SettingsPage() {
  const { settings, setSettings } = useReaderSettings()
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<'drafts' | 'cache' | null>(null)

  const onClearDrafts = async () => {
    if (
      !confirm(
        '기기에 저장된 수정 원고를 모두 삭제할까요?\n(서버 원본 회차는 그대로 두고, 편집해 둔 내용만 지웁니다.)',
      )
    ) {
      return
    }
    setBusy('drafts')
    setMsg(null)
    try {
      const count = await deleteAllDrafts()
      setMsg(count > 0 ? `수정 원고 ${count}개를 삭제했습니다.` : '삭제할 수정 원고가 없습니다.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    } finally {
      setBusy(null)
    }
  }

  const onClearCache = async () => {
    if (
      !confirm(
        '캐시와 수정 원고를 모두 지울까요?\n오래된 회차 내용이 남아 있을 때 사용하세요.\n(글자 크기 설정은 유지됩니다. 완료 후 새로고침합니다.)',
      )
    ) {
      return
    }
    setBusy('cache')
    setMsg(null)
    try {
      const result = await clearManuscriptCache()
      setMsg(
        `캐시 ${result.cacheBuckets}개 · 수정 원고 ${result.drafts}개 삭제. 새로고침합니다…`,
      )
      setTimeout(() => {
        window.location.reload()
      }, 600)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '캐시 삭제에 실패했습니다.')
      setBusy(null)
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>설정</h1>
        <p className="lede">읽기 기본값과 작품 등록 안내</p>
      </header>

      <InstallPwa variant="card" force />

      <section className="settings-block">
        <h2>캐시 / 원고</h2>
        <p className="install-hint" style={{ marginTop: 0 }}>
          예전 회차가 보이거나 수정본이 남아 있으면 캐시를 지워 주세요. 서버에 올린 원본은
          삭제되지 않습니다.
        </p>
        <div className="settings-actions">
          <button
            type="button"
            className="primary-btn install-btn"
            disabled={busy !== null}
            onClick={() => void onClearCache()}
          >
            {busy === 'cache' ? '지우는 중…' : '캐시·수정 원고 지우기'}
          </button>
          <button
            type="button"
            className="ghost-btn"
            disabled={busy !== null}
            onClick={() => void onClearDrafts()}
          >
            {busy === 'drafts' ? '삭제 중…' : '수정 원고만 삭제'}
          </button>
        </div>
        {msg && <p className="export-msg">{msg}</p>}
      </section>

      <section className="settings-block">
        <h2>읽기 기록</h2>
        <p className="install-hint" style={{ marginTop: 0 }}>
          읽은 회차와 스크롤 위치는 기기 안 SQLite(IndexedDB)에 저장됩니다. 브라우저 데이터를
          지우면 함께 삭제됩니다.
        </p>
      </section>

      <section className="settings-block">
        <h2>기본 읽기 설정</h2>
        <label className="setting-row">
          <span>글자 크기</span>
          <input
            type="range"
            min={14}
            max={28}
            value={settings.fontSize}
            onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })}
          />
          <span className="setting-value">{settings.fontSize}px</span>
        </label>
        <label className="setting-row">
          <span>줄 간격</span>
          <input
            type="range"
            min={14}
            max={24}
            step={1}
            value={Math.round(settings.lineHeight * 10)}
            onChange={(e) =>
              setSettings({ ...settings, lineHeight: Number(e.target.value) / 10 })
            }
          />
          <span className="setting-value">{settings.lineHeight.toFixed(1)}</span>
        </label>
      </section>

      <section className="settings-block guide">
        <h2>작품 등록 방법</h2>
        <ol>
          <li>
            <code>public/novels/작품슬러그/</code> 폴더 생성
          </li>
          <li>
            <code>meta.json</code>에 제목·작가·소개 작성
          </li>
          <li>
            회차를 <code>001.md</code>, <code>002.md</code> … 로 추가
          </li>
          <li>
            <code>npm run generate</code> 실행 후 커밋
          </li>
        </ol>
        <pre className="code-sample">{`---
title: 1화 제목
---

본문 내용…`}</pre>
      </section>
    </div>
  )
}
