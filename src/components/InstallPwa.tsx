import { usePwaInstall } from '../hooks/usePwaInstall'

type Props = {
  /** floating banner above bottom nav */
  variant?: 'banner' | 'card' | 'button'
  /** ignore previous dismiss (settings) */
  force?: boolean
}

export function InstallPwa({ variant = 'banner', force = false }: Props) {
  const {
    showInstallUi,
    dismissed,
    installed,
    isIos,
    iosGuideOpen,
    setIosGuideOpen,
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

  if (!showInstallUi) {
    if (variant === 'card') {
      return (
        <section className="settings-block install-card">
          <h2>앱 설치</h2>
          <p className="install-hint">
            설치 준비가 되면 여기에 버튼이 나타납니다. Chrome/Edge 모바일에서 다시 열어보세요.
          </p>
          <button type="button" className="primary-btn install-btn" onClick={() => void install()}>
            앱으로 설치
          </button>
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

  if (variant === 'button') {
    return (
      <>
        <button type="button" className="primary-btn install-btn" onClick={onInstall}>
          앱으로 설치
        </button>
        {iosGuideOpen && <IosGuide onClose={() => setIosGuideOpen(false)} />}
      </>
    )
  }

  if (variant === 'card') {
    return (
      <>
        <section className="settings-block install-card">
          <h2>앱 설치</h2>
          <p>
            {isIos
              ? 'Safari 공유 메뉴에서 홈 화면에 추가할 수 있어요.'
              : '홈 화면에 추가하면 앱처럼 빠르게 열 수 있어요.'}
          </p>
          <button type="button" className="primary-btn install-btn" onClick={onInstall}>
            앱으로 설치
          </button>
        </section>
        {iosGuideOpen && <IosGuide onClose={() => setIosGuideOpen(false)} />}
      </>
    )
  }

  return (
    <>
      <aside className="install-banner" role="region" aria-label="앱 설치">
        <div className="install-banner-text">
          <strong>리드 앱 설치</strong>
          <span>{isIos ? '홈 화면에 추가하세요' : '오프라인에서도 읽을 수 있어요'}</span>
        </div>
        <div className="install-banner-actions">
          <button type="button" className="ghost-btn" onClick={dismiss} aria-label="닫기">
            나중에
          </button>
          <button type="button" className="primary-btn install-btn compact" onClick={onInstall}>
            설치
          </button>
        </div>
      </aside>
      {iosGuideOpen && <IosGuide onClose={() => setIosGuideOpen(false)} />}
    </>
  )
}

function IosGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="settings-sheet" role="dialog" aria-label="iOS 설치 안내">
      <button type="button" className="sheet-backdrop" aria-label="닫기" onClick={onClose} />
      <div className="sheet-body">
        <header className="sheet-head">
          <h2>홈 화면에 추가</h2>
          <button type="button" className="ghost-btn" onClick={onClose}>
            닫기
          </button>
        </header>
        <ol className="ios-install-steps">
          <li>
            하단 <strong>공유</strong> 버튼(□↑)을 탭하세요
          </li>
          <li>
            <strong>홈 화면에 추가</strong>를 선택하세요
          </li>
          <li>
            <strong>추가</strong>를 누르면 완료됩니다
          </li>
        </ol>
        <p className="install-hint">Safari에서만 설치할 수 있습니다.</p>
      </div>
    </div>
  )
}
