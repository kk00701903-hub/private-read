import { useCallback, useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'read-pwa:install-dismissed'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return mq || iosStandalone
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

// Capture early — before React mounts can miss the event
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

export function usePwaInstall() {
  const [canPrompt, setCanPrompt] = useState(() => deferredPrompt != null)
  const [installed, setInstalled] = useState(() => isStandalone())
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const [iosGuideOpen, setIosGuideOpen] = useState(false)

  useEffect(() => {
    const sync = () => {
      setCanPrompt(deferredPrompt != null)
      setInstalled(isStandalone())
    }
    listeners.add(sync)
    sync()
    return () => {
      listeners.delete(sync)
    }
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
    setIosGuideOpen(false)
  }, [])

  const clearDismiss = useCallback(() => {
    localStorage.removeItem(DISMISS_KEY)
    setDismissed(false)
  }, [])

  const install = useCallback(async () => {
    if (isIos() && !isStandalone()) {
      setIosGuideOpen(true)
      return { outcome: 'ios-guide' as const }
    }

    if (!deferredPrompt) {
      window.alert(
        '지금 바로 설치할 수 없습니다.\nChrome/Edge 모바일에서 사이트를 연 뒤 다시 시도하거나, 브라우저 메뉴의 "앱 설치" / "홈 화면에 추가"를 사용하세요.',
      )
      return { outcome: 'unavailable' as const }
    }

    const promptEvent = deferredPrompt
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') {
      deferredPrompt = null
      setCanPrompt(false)
      setInstalled(true)
    }
    return { outcome: choice.outcome }
  }, [])

  const showInstallUi = !installed && (canPrompt || isIos())

  return {
    canPrompt,
    installed,
    dismissed,
    showInstallUi,
    isIos: isIos(),
    iosGuideOpen,
    setIosGuideOpen,
    install,
    dismiss,
    clearDismiss,
  }
}
