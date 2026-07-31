import { InstallPwa } from '../components/InstallPwa'
import { useReaderSettings } from '../hooks/useReader'

export function SettingsPage() {
  const { settings, setSettings } = useReaderSettings()

  return (
    <div className="page">
      <header className="page-head">
        <h1>설정</h1>
        <p className="lede">읽기 기본값과 작품 등록 안내</p>
      </header>

      <InstallPwa variant="card" force />

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
