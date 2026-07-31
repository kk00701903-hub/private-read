import { useCallback, useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __pwaDeferredPrompt?: BeforeInstallPromptEvent | null
  }
}

const DISMISS_KEY = 'read-pwa:install-dismissed'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const iosStandalone =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return mq || iosStandalone
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
}

function getDeferred(): BeforeInstallPromptEvent | null {
  return (typeof window !== 'undefined' && window.__pwaDeferredPrompt) || null
}

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    window.__pwaDeferredPrompt = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('pwa-install-available', () => notify())
  window.addEventListener('appinstalled', () => {
    window.__pwaDeferredPrompt = null
    notify()
  })
}

export type InstallGuideKind = 'ios' | 'android' | 'desktop' | null

export function usePwaInstall() {
  const [canPrompt, setCanPrompt] = useState(() => getDeferred() != null)
  const [installed, setInstalled] = useState(() => isStandalone())
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  const [guide, setGuide] = useState<InstallGuideKind>(null)
  const [swReady, setSwReady] = useState(false)

  useEffect(() => {
    const sync = () => {
      setCanPrompt(getDeferred() != null)
      setInstalled(isStandalone())
    }
    listeners.add(sync)
    sync()

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => {
          setSwReady(true)
          sync()
        })
        .catch(() => setSwReady(false))
    }

    return () => {
      listeners.delete(sync)
    }
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
    setGuide(null)
  }, [])

  const clearDismiss = useCallback(() => {
    localStorage.removeItem(DISMISS_KEY)
    setDismissed(false)
  }, [])

  const install = useCallback(async () => {
    if (isStandalone()) {
      setInstalled(true)
      return { outcome: 'installed' as const }
    }

    const deferred = getDeferred()
    if (deferred) {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') {
        window.__pwaDeferredPrompt = null
        setCanPrompt(false)
        setInstalled(true)
        setGuide(null)
      }
      return { outcome: choice.outcome }
    }

    // Native prompt 없음 → 수동 안내
    if (isIos()) setGuide('ios')
    else if (isAndroid()) setGuide('android')
    else setGuide('desktop')

    return { outcome: 'manual' as const }
  }, [])

  return {
    canPrompt,
    installed,
    dismissed,
    swReady,
    isIos: isIos(),
    isAndroid: isAndroid(),
    guide,
    setGuide,
    install,
    dismiss,
    clearDismiss,
  }
}
