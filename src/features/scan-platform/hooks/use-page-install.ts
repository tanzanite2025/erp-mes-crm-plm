import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type InstallPromptOutcome = 'accepted' | 'dismissed'

interface BeforeInstallPromptEventLike extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: InstallPromptOutcome; platform: string }>
}

export interface PageInstallOptions {
  manifestHref: string
  autoPrompt?: boolean
}

export interface PageInstallState {
  canInstall: boolean
  isInstalled: boolean
  isPromptAvailable: boolean
  installLabel: string
  fallbackHint: string
  promptInstall: () => Promise<void>
}

function isStandaloneMode() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function getFallbackHint() {
  if (typeof navigator === 'undefined') return '请使用支持安装的浏览器打开此页面。'

  const userAgent = navigator.userAgent.toLowerCase()
  const isIOS = /iphone|ipad|ipod/.test(userAgent)
  const isSafari = isIOS && /safari/.test(userAgent) && !/crios|fxios/.test(userAgent)

  if (isSafari) {
    return '在 Safari 中点击分享按钮，再选择“添加到主屏幕”。'
  }

  return '请在支持安装的浏览器中打开此页，并使用浏览器菜单中的“安装应用”或“添加到桌面”。'
}

function upsertManifestLink(href: string) {
  const existing = document.querySelector<HTMLLinkElement>('link[data-scan-platform-manifest="true"]')
  if (existing) {
    existing.href = href
    return existing
  }

  const link = document.createElement('link')
  link.rel = 'manifest'
  link.href = href
  link.setAttribute('data-scan-platform-manifest', 'true')
  document.head.appendChild(link)
  return link
}

export function usePageInstall({ manifestHref, autoPrompt = false }: PageInstallOptions): PageInstallState {
  const promptEventRef = useRef<BeforeInstallPromptEventLike | null>(null)
  const autoPromptRequestedRef = useRef(false)
  const [isInstalled, setIsInstalled] = useState(isStandaloneMode)
  const [isPromptAvailable, setIsPromptAvailable] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') return
    upsertManifestLink(manifestHref)
  }, [manifestHref])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEventLike
      installEvent.preventDefault()
      promptEventRef.current = installEvent
      setIsPromptAvailable(true)
    }

    const handleAppInstalled = () => {
      promptEventRef.current = null
      setIsPromptAvailable(false)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (isInstalled) return

    const promptEvent = promptEventRef.current
    if (!promptEvent) return

    await promptEvent.prompt()
    const choice = await promptEvent.userChoice

    if (choice.outcome === 'accepted') {
      setIsInstalled(true)
    }

    promptEventRef.current = null
    setIsPromptAvailable(false)
  }, [isInstalled])

  useEffect(() => {
    if (!autoPrompt || autoPromptRequestedRef.current || isInstalled || !isPromptAvailable) return
    autoPromptRequestedRef.current = true
    void promptInstall()
  }, [autoPrompt, isInstalled, isPromptAvailable, promptInstall])

  return useMemo(
    () => ({
      canInstall: !isInstalled,
      isInstalled,
      isPromptAvailable,
      installLabel: isInstalled
        ? 'ALREADY_INSTALLED'
        : isPromptAvailable
          ? 'ADD_TO_HOME_SCREEN'
          : 'INSTALL_GUIDE',
      fallbackHint: getFallbackHint(),
      promptInstall,
    }),
    [isInstalled, isPromptAvailable, promptInstall]
  )
}
