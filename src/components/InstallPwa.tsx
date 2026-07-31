import { usePwaInstall, type InstallGuideKind } from '../hooks/usePwaInstall'

type Props = {
  variant?: 'banner' | 'card' | 'button'
  force?: boolean
}

export function InstallPwa({ variant = 'banner', force = false }: Props) {
  const {
    canPrompt,
    dismissed,
    installed,
    isIos,
    guide,
    setGuide,
    install,
    dismiss,
    clearDismiss,
  } = usePwaInstall()

  if (installed) {
    if (variant === 'card') {
      return (
        <section className="settings-block install-card installed">
          <h2>앱 설치</h2>
          <p>이미 홈 화면에 설치된 상태입니다.</p>
        </section>
      )
    }
    return null
  }

  if (!force && dismissed && variant === 'banner') return null

  const onInstall = () => {
    if (force) clearDismiss()
    void install()
  }

  const statusHint = canPrompt
    ? '버튼을 누르면 설치 창이 열립니다.'
    : isIos
      ? 'iPhone은 Safari 공유 메뉴로 추가합니다.'
      : '버튼을 누르면 설치 방법을 안내합니다.'

  if (variant === 'button') {
    return (
      <>
        <button type="button" className="primary-btn install-btn" onClick={onInstall}>
          앱으로 설치
        </button>
        {guide && <InstallGuide kind={guide} onClose={() => setGuide(null)} />}
      </>
    )
  }

  if (variant === 'card') {
    return (
      <>
        <section className="settings-block install-card">
          <h2>앱 설치</h2>
          <p>{statusHint}</p>
          <button type="button" className="primary-btn install-btn" onClick={onInstall}>
            앱으로 설치
          </button>
        </section>
        {guide && <InstallGuide kind={guide} onClose={() => setGuide(null)} />}
      </>
    )
  }

  return (
    <>
      <aside className="install-banner" role="region" aria-label="앱 설치">
        <div className="install-banner-text">
          <strong>리드 앱 설치</strong>
          <span>{statusHint}</span>
        </div>
        <div className="install-banner-actions">
          <button type="button" className="ghost-btn" onClick={dismiss}>
            나중에
          </button>
          <button type="button" className="primary-btn install-btn compact" onClick={onInstall}>
            설치
          </button>
        </div>
      </aside>
      {guide && <InstallGuide kind={guide} onClose={() => setGuide(null)} />}
    </>
  )
}

function InstallGuide({ kind, onClose }: { kind: InstallGuideKind; onClose: () => void }) {
  if (!kind) return null

  const title =
    kind === 'ios' ? 'iPhone 설치 방법' : kind === 'android' ? 'Android 설치 방법' : 'PC 설치 방법'

  return (
    <div className="settings-sheet" role="dialog" aria-label={title}>
      <button type="button" className="sheet-backdrop" aria-label="닫기" onClick={onClose} />
      <div className="sheet-body">
        <header className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="ghost-btn" onClick={onClose}>
            닫기
          </button>
        </header>

        {kind === 'ios' && (
          <ol className="ios-install-steps">
            <li>
              반드시 <strong>Safari</strong>로 이 사이트를 여세요 (크롬/카카오톡 브라우저 X)
            </li>
            <li>
              하단 <strong>공유</strong> 버튼(□↑)을 탭하세요
            </li>
            <li>
              <strong>홈 화면에 추가</strong> → <strong>추가</strong>
            </li>
          </ol>
        )}

        {kind === 'android' && (
          <ol className="ios-install-steps">
            <li>
              <strong>Chrome</strong>으로 이 사이트를 여세요 (카카오톡·인앱 브라우저 X)
            </li>
            <li>
              우측 상단 <strong>⋮ 메뉴</strong>를 탭하세요
            </li>
            <li>
              <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를 선택하세요
            </li>
            <li>안 보이면 주소창 옆 설치 아이콘을 확인하세요</li>
          </ol>
        )}

        {kind === 'desktop' && (
          <ol className="ios-install-steps">
            <li>
              <strong>Chrome</strong> 또는 <strong>Edge</strong>로 열어주세요
            </li>
            <li>
              주소창 오른쪽 <strong>설치</strong> 아이콘(모니터+↓)을 클릭하세요
            </li>
            <li>
              또는 메뉴 → <strong>앱 설치…</strong> / <strong>Install app</strong>
            </li>
          </ol>
        )}

        <p className="install-hint">
          카카오톡·인스타 등 인앱 브라우저에서는 설치가 안 됩니다. 외부 브라우저로 열어주세요.
        </p>
      </div>
    </div>
  )
}
