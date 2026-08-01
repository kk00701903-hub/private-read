import { useState } from 'react'
import { InstallPwa } from '../components/InstallPwa'
import { useReaderSettings } from '../hooks/useReader'
import { deleteAllDrafts } from '../lib/db'

export function SettingsPage() {
  const { settings, setSettings } = useReaderSettings()
  const [draftMsg, setDraftMsg] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  const onClearDrafts = async () => {
    if (!confirm('기기에 저장된 수정 원고를 모두 삭제할까요?\n(서버 원본 회차는 그대로 두고, 편집해 둔 내용만 지웁니다.)')) {
      return
    }
    setClearing(true)
    setDraftMsg(null)
    try {
      const count = await deleteAllDrafts()
      setDraftMsg(count > 0 ? `수정 원고 ${count}개를 삭제했습니다.` : '삭제할 수정 원고가 없습니다.')
    } catch (e) {
      setDraftMsg(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    } finally {
      setClearing(false)
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
        <h2>읽기 기록</h2>
        <p className="install-hint" style={{ marginTop: 0 }}>
          읽은 회차와 스크롤 위치는 기기 안 SQLite(IndexedDB)에 저장됩니다. 브라우저 데이터를
          지우면 함께 삭제됩니다.
        </p>
      </section>

      <section className="settings-block">
        <h2>수정 원고</h2>
        <p className="install-hint" style={{ marginTop: 0 }}>
          원고 탭에서 저장한 수정본이 원본보다 우선 표시됩니다. 기존 수정본을 지우려면 아래에서
          삭제하세요.
        </p>
        <button
          type="button"
          className="primary-btn install-btn"
          style={{ marginTop: 12 }}
          disabled={clearing}
          onClick={() => void onClearDrafts()}
        >
          {clearing ? '삭제 중…' : '수정 원고 전체 삭제'}
        </button>
        {draftMsg && <p className="export-msg">{draftMsg}</p>}
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
