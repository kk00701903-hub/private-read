import type { ReaderSettings, ReaderTheme } from '../types'

type Props = {
  open: boolean
  settings: ReaderSettings
  onChange: (next: ReaderSettings) => void
  onClose: () => void
}

const themes: { id: ReaderTheme; label: string }[] = [
  { id: 'paper', label: '밝게' },
  { id: 'sepia', label: '세피아' },
  { id: 'night', label: '어둡게' },
]

export function ReaderSettingsPanel({ open, settings, onChange, onClose }: Props) {
  if (!open) return null

  return (
    <div className="settings-sheet" role="dialog" aria-label="읽기 설정">
      <button type="button" className="sheet-backdrop" aria-label="닫기" onClick={onClose} />
      <div className="sheet-body">
        <header className="sheet-head">
          <h2>읽기 설정</h2>
          <button type="button" className="ghost-btn" onClick={onClose}>
            완료
          </button>
        </header>

        <label className="setting-row">
          <span>글자 크기</span>
          <div className="setting-controls">
            <button
              type="button"
              onClick={() =>
                onChange({ ...settings, fontSize: Math.max(14, settings.fontSize - 1) })
              }
            >
              A−
            </button>
            <span className="setting-value">{settings.fontSize}px</span>
            <button
              type="button"
              onClick={() =>
                onChange({ ...settings, fontSize: Math.min(28, settings.fontSize + 1) })
              }
            >
              A+
            </button>
          </div>
        </label>

        <label className="setting-row">
          <span>줄 간격</span>
          <div className="setting-controls">
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...settings,
                  lineHeight: Math.max(1.4, Number((settings.lineHeight - 0.1).toFixed(1))),
                })
              }
            >
              −
            </button>
            <span className="setting-value">{settings.lineHeight.toFixed(1)}</span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...settings,
                  lineHeight: Math.min(2.4, Number((settings.lineHeight + 0.1).toFixed(1))),
                })
              }
            >
              +
            </button>
          </div>
        </label>

        <div className="setting-row">
          <span>배경</span>
          <div className="theme-pills">
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`theme-pill theme-${t.id} ${settings.theme === t.id ? 'on' : ''}`}
                onClick={() => onChange({ ...settings, theme: t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
