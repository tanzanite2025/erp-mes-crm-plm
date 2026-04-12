import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  CheckCircle2,
  CloudOff,
  Loader2,
  Lock,
  MoveUpRight,
  Power,
  RefreshCw,
  ScanLine,
  SmartphoneCharging,
  TriangleAlert,
  Unlock,
  Volume2,
  Workflow,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { normalizeMachineCode, normalizeSceneKey } from '@/lib/codecs/code-normalization'
import { canOpenRouteEntryNonBlocking } from '@/features/authz/guards/route-entry-access'
import { ForbiddenState } from '@/components/forbidden-state'
import { TrackingNumberInput } from '@/components/tracking-number-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  createDefaultLinearBarcodeProtocolConfig,
  type LinearBarcodeProtocolConfig,
} from '@/features/basic-settings/data/linear-barcode-protocol'
import { linearBarcodeProtocolService } from '@/features/basic-settings/services/linear-barcode-protocol-service'
import {
  pdaIngestService,
  type PDAIngestRequest,
  type PDAIngestResponse,
} from '../services/pda-ingest-service'
import {
  clearPDAShellRetryQueue,
  enqueuePDAShellRetry,
  listPDAShellRetryQueue,
  listPDAShellRetryQueueByScene,
  removePDAShellRetry,
  updatePDAShellRetry,
  type PDAIngestRetryItem,
  type PDAIngestRetrySceneGroup,
} from '../services/pda-shell-queue-service'
import { isForbiddenError } from '@/lib/error-status'
import { useAuthStore } from '@/stores/auth-store'

const logger = createLogger('PDAShellTab')

type ShellStatusTone = 'idle' | 'success' | 'warning' | 'error'

type WakeLockSentinelLike = {
  released?: boolean
  release: () => Promise<void>
  addEventListener?: (type: string, listener: () => void) => void
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>
  }
}

const HOTKEYS = ['AudioVolumeUp', 'AudioVolumeDown', 'VolumeUp', 'VolumeDown', 'F9', 'F10']

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

function getOnlineState() {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

function createShellPayload(
  rawCode: string,
  config: LinearBarcodeProtocolConfig
): PDAIngestRequest {
  return {
    rawCode,
    symbology: config.ingestDefaults.symbology,
    scene: config.ingestDefaults.scene,
    deviceId: config.ingestDefaults.deviceId,
    scannedQty: config.ingestDefaults.scannedQty,
    metadata: {
      source: 'pda-shell',
      autoSubmit: true,
    },
  }
}

async function enterFullscreen() {
  if (typeof document === 'undefined') return
  const target = document.documentElement as HTMLElement & {
    requestFullscreen?: () => Promise<void>
  }

  if (!document.fullscreenElement && target.requestFullscreen) {
    await target.requestFullscreen().catch(() => undefined)
  }
}

async function exitFullscreen() {
  if (typeof document === 'undefined') return
  if (document.fullscreenElement && document.exitFullscreen) {
    await document.exitFullscreen().catch(() => undefined)
  }
}

export function PDAShellTab() {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const canOpenWorkbench = canOpenRouteEntryNonBlocking(user, '/terminal-config/pda')
  const [protocolConfig, setProtocolConfig] = useState<LinearBarcodeProtocolConfig>(
    createDefaultLinearBarcodeProtocolConfig
  )
  const [rawCode, setRawCode] = useState('')
  const [queue, setQueue] = useState<PDAIngestRetryItem[]>([])
  const [sceneGroups, setSceneGroups] = useState<PDAIngestRetrySceneGroup[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [lastResult, setLastResult] = useState<PDAIngestResponse | null>(null)
  const [lastMessage, setLastMessage] = useState(t('terminalConfig.pdaShell.status.waiting'))
  const [statusTone, setStatusTone] = useState<ShellStatusTone>('idle')
  const [isOnline, setIsOnline] = useState(getOnlineState)
  const [lockMode, setLockMode] = useState(false)
  const [keepAwake, setKeepAwake] = useState(true)
  const [pageError, setPageError] = useState<unknown>(null)
  const [isWakeLocked, setIsWakeLocked] = useState(false)
  const [supportsWakeLock, setSupportsWakeLock] = useState(false)
  const [scannerWakeSignal, setScannerWakeSignal] = useState(0)
  const lastAutoSubmittedRef = useRef('')
  const retryLockRef = useRef(false)
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null)

  const currentScene = protocolConfig.ingestDefaults.scene || 'general'

  const sceneLabels = useMemo(
    () => ({
      general: t('terminalConfig.pda.sceneOptions.general'),
      stocktake: t('terminalConfig.pda.sceneOptions.stocktake'),
      production: t('terminalConfig.pda.sceneOptions.production'),
      traceability: t('terminalConfig.pda.sceneOptions.traceability'),
    }),
    [t]
  )

  const getSceneLabel = useCallback(
    (scene: string) => sceneLabels[scene as keyof typeof sceneLabels] ?? scene,
    [sceneLabels]
  )

  const currentSceneLabel = getSceneLabel(currentScene)

  const refreshQueue = useCallback(async () => {
    const [nextQueue, nextSceneGroups] = await Promise.all([
      listPDAShellRetryQueue(),
      listPDAShellRetryQueueByScene(),
    ])
    setQueue(nextQueue)
    setSceneGroups(nextSceneGroups)
  }, [])

  useEffect(() => {
    setSupportsWakeLock(Boolean((navigator as NavigatorWithWakeLock | undefined)?.wakeLock))
  }, [])

  useEffect(() => {
    setLastMessage(t('terminalConfig.pdaShell.status.waiting'))
  }, [t])

  useEffect(() => {
    let active = true

    const loadConfig = async () => {
      if (active) {
        setPageError(null)
      }
      setIsLoadingConfig(true)
      try {
        const config = await linearBarcodeProtocolService.getConfig()
        if (!active) return
        setProtocolConfig(config)
      } catch (error) {
        if (active) {
          setPageError(error)
        }
        logger.error('Failed to load protocol config', error)
      } finally {
        if (active) {
          setIsLoadingConfig(false)
        }
      }
    }

    void loadConfig()
    void refreshQueue().catch((error) => {
      if (active) {
        setPageError(error)
      }
      logger.error('Failed to load PDA retry queue', error)
    })

    return () => {
      active = false
    }
  }, [refreshQueue])

  const acquireWakeLock = useCallback(async () => {
    if (!keepAwake) return
    const wakeLockApi = (navigator as NavigatorWithWakeLock | undefined)?.wakeLock
    if (!wakeLockApi?.request) return

    try {
      wakeLockRef.current = await wakeLockApi.request('screen')
      setIsWakeLocked(true)
      wakeLockRef.current.addEventListener?.('release', () => {
        setIsWakeLocked(false)
      })
    } catch (error) {
      logger.error('Failed to acquire wake lock', error)
      setIsWakeLocked(false)
    }
  }, [keepAwake])

  const releaseWakeLock = useCallback(async () => {
    if (!wakeLockRef.current) return
    await wakeLockRef.current.release().catch(() => undefined)
    wakeLockRef.current = null
    setIsWakeLocked(false)
  }, [])

  useEffect(() => {
    if (keepAwake) {
      void acquireWakeLock()
      return
    }

    void releaseWakeLock()
  }, [acquireWakeLock, keepAwake, releaseWakeLock])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && keepAwake) {
        void acquireWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [acquireWakeLock, keepAwake])

  useEffect(() => {
    return () => {
      void releaseWakeLock()
    }
  }, [releaseWakeLock])

  const retryQueued = useCallback(
    async (targetScene?: string) => {
      if (retryLockRef.current || !getOnlineState()) return

      const queuedItems = await listPDAShellRetryQueue()
      if (!queuedItems.length) return

      const normalizedScene = normalizeSceneKey(targetScene, '')
      const orderedItems = [...queuedItems].sort((a, b) => {
        if (!normalizedScene) return b.lastQueuedAt.localeCompare(a.lastQueuedAt)
        if (a.scene === normalizedScene && b.scene !== normalizedScene) return -1
        if (a.scene !== normalizedScene && b.scene === normalizedScene) return 1
        return b.lastQueuedAt.localeCompare(a.lastQueuedAt)
      })

      retryLockRef.current = true
      setIsRetrying(true)

      try {
        for (const item of orderedItems) {
          if (normalizedScene && item.scene !== normalizedScene) {
            continue
          }

          try {
            await pdaIngestService.ingest(item.payload)
            await removePDAShellRetry(item.id)
            setLastMessage(
              t('terminalConfig.pdaShell.status.retrySuccess', {
                code: item.payload.rawCode,
              })
            )
            setStatusTone('success')
            vibrate(35)
          } catch (error) {
            await updatePDAShellRetry({
              ...item,
              attempts: item.attempts + 1,
              lastTriedAt: new Date().toISOString(),
              lastError: error instanceof Error ? error.message : 'retry failed',
            })
          }
        }
      } finally {
        retryLockRef.current = false
        setIsRetrying(false)
        await refreshQueue()
      }
    },
    [refreshQueue, t]
  )

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      void retryQueued(currentScene)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [currentScene, retryQueued])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void retryQueued(currentScene)
    }, 15000)

    return () => window.clearInterval(timer)
  }, [currentScene, retryQueued])

  useEffect(() => {
    const handleHotkey = (event: KeyboardEvent) => {
      if (!HOTKEYS.includes(event.key)) {
        if (lockMode && event.key === 'Escape') {
          setLockMode(false)
          void exitFullscreen()
        }
        return
      }

      event.preventDefault()
      setScannerWakeSignal((current) => current + 1)
      setStatusTone('idle')
      setLastMessage(t('terminalConfig.pdaShell.status.hotkeyWake'))
      vibrate(20)
    }

    window.addEventListener('keydown', handleHotkey)
    return () => window.removeEventListener('keydown', handleHotkey)
  }, [lockMode, t])

  const submitRawCode = useCallback(
    async (value: string) => {
      const normalized = normalizeMachineCode(value)
      if (!normalized) return

      const payload = createShellPayload(normalized, protocolConfig)
      setIsSubmitting(true)

      try {
        const response = await pdaIngestService.ingest(payload)
        setLastResult(response)
        setLastMessage(response.parsed.summary)
        setStatusTone('success')
        setRawCode('')
        lastAutoSubmittedRef.current = normalized
        vibrate(30)
        toast.success(t('terminalConfig.pdaShell.toast.scanCollected'), {
          description: response.parsed.shortTag,
        })
        await refreshQueue()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'ingest failed'
        const queued = await enqueuePDAShellRetry(payload, message)
        setLastMessage(
          queued.duplicateCount > 1
            ? t('terminalConfig.pdaShell.status.duplicateQueued', {
                code: normalized,
                count: queued.duplicateCount,
              })
            : t('terminalConfig.pdaShell.status.queuedByScene', {
                scene: getSceneLabel(queued.scene),
              })
        )
        setStatusTone(isOnline ? 'warning' : 'error')
        setRawCode('')
        lastAutoSubmittedRef.current = normalized
        vibrate([80, 50, 80])
        toast.error(t('terminalConfig.pdaShell.toast.submitQueued'), { description: message })
        await refreshQueue()
      } finally {
        setIsSubmitting(false)
      }
    },
    [getSceneLabel, isOnline, protocolConfig, refreshQueue, t]
  )

  const normalizedRawCode = useMemo(() => normalizeMachineCode(rawCode), [rawCode])
  const currentSceneQueue = useMemo(
    () => queue.filter((item) => item.scene === currentScene),
    [currentScene, queue]
  )

  useEffect(() => {
    if (!normalizedRawCode || isSubmitting) return
    if (normalizedRawCode === lastAutoSubmittedRef.current) return

    const timer = window.setTimeout(() => {
      void submitRawCode(normalizedRawCode)
    }, 220)

    return () => window.clearTimeout(timer)
  }, [isSubmitting, normalizedRawCode, submitRawCode])

  const toneStyles: Record<ShellStatusTone, string> = {
    idle: 'border-slate-300/60 bg-slate-100/70 text-slate-700',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
    error: 'border-rose-500/30 bg-rose-500/10 text-rose-700',
  }

  const shellTheme = lockMode
    ? {
        page: 'min-h-full bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.16),_transparent_32%),linear-gradient(180deg,_rgba(2,6,23,1)_0%,_rgba(15,23,42,1)_100%)] px-2 py-2 md:px-4 md:py-4',
        card: 'border-slate-700/70 bg-slate-950/85 text-white shadow-[0_25px_70px_rgba(2,6,23,0.45)]',
        muted: 'text-slate-300',
      }
    : {
        page: 'min-h-full bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.14),_transparent_40%),linear-gradient(180deg,_rgba(248,250,252,1)_0%,_rgba(241,245,249,1)_100%)] px-3 py-4 md:px-6 md:py-6',
        card: 'border-slate-300/70 bg-white/95 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.08)]',
        muted: 'text-slate-600',
      }

  if (isForbiddenError(pageError)) {
    return <ForbiddenState />
  }

  return (
    <div className={shellTheme.page}>
      <div className='mx-auto flex max-w-3xl flex-col gap-4'>
        <div className={`rounded-[30px] border border-dashed p-5 backdrop-blur ${shellTheme.card}`}>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div className='space-y-2'>
              <div className='inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 md:text-emerald-700'>
                <SmartphoneCharging className='size-3.5' />
                {t('terminalConfig.pdaShell.page.badge')}
              </div>
              <h1 className='text-2xl font-black tracking-tight'>{t('terminalConfig.pdaShell.page.title')}</h1>
              <p className={`text-sm font-medium leading-relaxed ${shellTheme.muted}`}>
                {t('terminalConfig.pdaShell.page.description')}
              </p>
            </div>

            <div className='flex flex-wrap gap-2'>
              <Badge className={isOnline ? 'bg-emerald-500/10 text-emerald-700 border-none' : 'bg-rose-500/10 text-rose-700 border-none'}>
                {isOnline
                  ? t('terminalConfig.pdaShell.page.online')
                  : t('terminalConfig.pdaShell.page.offline')}
              </Badge>
              <Badge className='bg-blue-500/10 text-blue-700 border-none'>
                {protocolConfig.ingestDefaults.deviceId}
              </Badge>
              <Badge className='bg-slate-900 text-white border-none'>
                {currentSceneLabel}
              </Badge>
              <Badge className='bg-slate-500/10 text-slate-600 border-none'>
                {isLoadingConfig
                  ? t('terminalConfig.pdaShell.page.configLoading')
                  : t('terminalConfig.pdaShell.page.configReady')}
              </Badge>
              <Badge className={isWakeLocked ? 'bg-amber-500/10 text-amber-700 border-none' : 'bg-slate-500/10 text-slate-600 border-none'}>
                {keepAwake
                  ? isWakeLocked
                    ? t('terminalConfig.pdaShell.page.wakeLockOn')
                    : t('terminalConfig.pdaShell.page.keepAwake')
                  : t('terminalConfig.pdaShell.page.wakeLockOff')}
              </Badge>
            </div>
          </div>
        </div>

        <Card className={`rounded-[30px] border-dashed ${shellTheme.card}`}>
          <CardContent className='space-y-5 p-5 md:p-6'>
            <div className='flex flex-wrap gap-3'>
              <Button
                className='h-11 rounded-full px-6 text-[11px] font-black uppercase tracking-widest'
                onClick={async () => {
                  const next = !lockMode
                  setLockMode(next)
                  if (next) {
                    await enterFullscreen()
                    setScannerWakeSignal((current) => current + 1)
                  } else {
                    await exitFullscreen()
                  }
                }}
              >
                {lockMode ? (
                  <Unlock className='mr-2 size-4' />
                ) : (
                  <Lock className='mr-2 size-4' />
                )}
                {lockMode
                  ? t('terminalConfig.pdaShell.actions.exitLockMode')
                  : t('terminalConfig.pdaShell.actions.enterLockMode')}
              </Button>

              <Button
                variant='outline'
                className='h-11 rounded-full px-6 text-[11px] font-black uppercase tracking-widest'
                onClick={() => setKeepAwake((current) => !current)}
              >
                <Zap className='mr-2 size-4' />
                {keepAwake
                  ? t('terminalConfig.pdaShell.actions.keepAwakeOn')
                  : t('terminalConfig.pdaShell.actions.keepAwakeOff')}
              </Button>

              <Button
                variant='outline'
                className='h-11 rounded-full px-6 text-[11px] font-black uppercase tracking-widest'
                onClick={() => {
                  setScannerWakeSignal((current) => current + 1)
                  setStatusTone('idle')
                  setLastMessage(t('terminalConfig.pdaShell.status.manualWake'))
                }}
              >
                <Power className='mr-2 size-4' />
                {t('terminalConfig.pdaShell.actions.wakeScanner')}
              </Button>

              <Button
                variant='outline'
                className='h-11 rounded-full px-6 text-[11px] font-black uppercase tracking-widest'
                onClick={() => void retryQueued(currentScene)}
                disabled={isRetrying || !currentSceneQueue.length}
              >
                {isRetrying ? (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                ) : (
                  <RefreshCw className='mr-2 size-4' />
                )}
                {t('terminalConfig.pdaShell.actions.retryScene')}
              </Button>
            </div>

            <div className='rounded-[24px] border border-dashed border-emerald-500/30 bg-emerald-500/5 p-4 md:p-5'>
              <TrackingNumberInput
                value={rawCode}
                onValueChange={(value) => {
                  const normalized = normalizeMachineCode(value)
                  if (normalized !== normalizeMachineCode(rawCode)) {
                    lastAutoSubmittedRef.current = ''
                  }
                  setRawCode(normalized)
                  setStatusTone('idle')
                  setLastMessage(t('terminalConfig.pdaShell.status.waiting'))
                }}
                placeholder={t('terminalConfig.pdaShell.input.placeholder')}
                inputClassName='h-14 rounded-2xl border-dashed bg-white text-lg font-black tracking-widest text-slate-900'
                showActionButtons={!lockMode}
                autoOpenScanner={lockMode}
                openScannerSignal={scannerWakeSignal}
              />
            </div>

            <div className={['rounded-[24px] border p-4 transition-colors', toneStyles[statusTone]].join(' ')}>
              <div className='flex items-start justify-between gap-3'>
                <div className='space-y-1'>
                  <div className='text-[10px] font-black uppercase tracking-[0.2em] opacity-70'>
                    {t('terminalConfig.pdaShell.status.title')}
                  </div>
                  <div className='text-base font-black'>{lastMessage}</div>
                  {lastResult ? (
                    <div className='text-xs font-medium opacity-75'>
                      {lastResult.parsed.rawCode} / {lastResult.parsed.productionDate}
                    </div>
                  ) : null}
                </div>
                {isSubmitting ? (
                  <Loader2 className='size-5 animate-spin' />
                ) : statusTone === 'success' ? (
                  <CheckCircle2 className='size-5' />
                ) : statusTone === 'error' ? (
                  <CloudOff className='size-5' />
                ) : (
                  <ScanLine className='size-5' />
                )}
              </div>
            </div>

            <div className='grid grid-cols-1 gap-3 sm:grid-cols-4'>
              <div className='rounded-[24px] border border-dashed border-slate-300/70 bg-slate-50/90 p-4'>
                <div className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500'>
                  {t('terminalConfig.pdaShell.stats.autoSubmitTitle')}
                </div>
                <div className='mt-2 text-2xl font-black text-slate-900'>
                  {t('terminalConfig.pdaShell.stats.autoSubmitValue')}
                </div>
                <div className='mt-1 text-xs font-medium text-slate-600'>
                  {t('terminalConfig.pdaShell.stats.autoSubmitHint')}
                </div>
              </div>

              <div className='rounded-[24px] border border-dashed border-slate-300/70 bg-slate-50/90 p-4'>
                <div className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500'>
                  {t('terminalConfig.pdaShell.stats.currentSceneTitle')}
                </div>
                <div className='mt-2 text-2xl font-black text-slate-900'>{currentSceneQueue.length}</div>
                <div className='mt-1 text-xs font-medium text-slate-600'>
                  {t('terminalConfig.pdaShell.stats.currentSceneHint')}
                </div>
              </div>

              <div className='rounded-[24px] border border-dashed border-slate-300/70 bg-slate-50/90 p-4'>
                <div className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500'>
                  {t('terminalConfig.pdaShell.stats.retryQueueTitle')}
                </div>
                <div className='mt-2 text-2xl font-black text-slate-900'>{queue.length}</div>
                <div className='mt-1 text-xs font-medium text-slate-600'>
                  {isRetrying
                    ? t('terminalConfig.pdaShell.stats.retryQueueHintRetrying')
                    : t('terminalConfig.pdaShell.stats.retryQueueHintIdle')}
                </div>
              </div>

              <div className='rounded-[24px] border border-dashed border-slate-300/70 bg-slate-50/90 p-4'>
                <div className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500'>
                  {t('terminalConfig.pdaShell.stats.wakeTitle')}
                </div>
                <div className='mt-2 flex items-center gap-2 text-lg font-black text-slate-900'>
                  <Volume2 className='size-4' />
                  {supportsWakeLock
                    ? t('terminalConfig.pdaShell.stats.wakeReady')
                    : t('terminalConfig.pdaShell.stats.wakeBestEffort')}
                </div>
                <div className='mt-1 text-xs font-medium text-slate-600'>
                  {t('terminalConfig.pdaShell.stats.wakeHint')}
                </div>
              </div>
            </div>

            {!lockMode ? (
              <div className='flex flex-wrap gap-3'>
                <Button
                  className='h-11 rounded-full px-6 text-[11px] font-black uppercase tracking-widest'
                  variant='outline'
                  onClick={() => {
                    void (async () => {
                      await clearPDAShellRetryQueue(currentScene)
                      await refreshQueue()
                    })()
                    toast.success(
                      t('terminalConfig.pdaShell.toast.clearSceneQueue', {
                        scene: currentSceneLabel,
                      })
                    )
                  }}
                  disabled={!currentSceneQueue.length}
                >
                  <TriangleAlert className='mr-2 size-4' />
                  {t('terminalConfig.pdaShell.actions.clearSceneQueue')}
                </Button>

                <Button
                  className='h-11 rounded-full px-6 text-[11px] font-black uppercase tracking-widest'
                  variant='outline'
                  onClick={() => {
                    void (async () => {
                      await clearPDAShellRetryQueue()
                      await refreshQueue()
                    })()
                    toast.success(t('terminalConfig.pdaShell.toast.clearAllQueue'))
                  }}
                  disabled={!queue.length}
                >
                  <TriangleAlert className='mr-2 size-4' />
                  {t('terminalConfig.pdaShell.actions.clearAllQueue')}
                </Button>

                {canOpenWorkbench ? (
                  <Button asChild className='h-11 rounded-full px-6 text-[11px] font-black uppercase tracking-widest'>
                    <Link to='/terminal-config/pda'>
                      <Workflow className='mr-2 size-4' />
                      {t('terminalConfig.pdaShell.actions.openWorkbench')}
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className='rounded-[24px] border border-dashed border-slate-700/70 bg-slate-900/60 p-4 text-sm font-medium text-slate-200'>
                {t('terminalConfig.pdaShell.hints.lockMode')}
              </div>
            )}
          </CardContent>
        </Card>

        {!lockMode && sceneGroups.length ? (
          <Card className={`rounded-[30px] border-dashed ${shellTheme.card}`}>
            <CardContent className='space-y-4 p-5 md:p-6'>
              <div className='text-[10px] font-black uppercase tracking-[0.24em] text-slate-500'>
                {t('terminalConfig.pdaShell.queue.sceneBucketsTitle')}
              </div>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
                {sceneGroups.map((group) => (
                  <div
                    key={group.scene}
                    className='rounded-2xl border border-dashed border-slate-300/70 bg-slate-50/90 p-4'
                  >
                    <div className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500'>
                      {getSceneLabel(group.scene)}
                    </div>
                    <div className='mt-2 text-2xl font-black text-slate-900'>{group.count}</div>
                    <div className='mt-1 text-xs font-medium text-slate-600'>
                      {t('terminalConfig.pdaShell.queue.sceneDuplicateSummary', {
                        count: group.duplicateCount,
                      })}
                    </div>
                    <Button
                      size='sm'
                      variant='outline'
                      className='mt-3 rounded-full text-[10px] font-black uppercase tracking-widest'
                      onClick={() => void retryQueued(group.scene)}
                    >
                      {t('terminalConfig.pdaShell.actions.retryBucket')}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!lockMode && queue.length ? (
          <Card className={`rounded-[30px] border-dashed ${shellTheme.card}`}>
            <CardContent className='space-y-3 p-5 md:p-6'>
              <div className='text-[10px] font-black uppercase tracking-[0.24em] text-slate-500'>
                {t('terminalConfig.pdaShell.queue.pendingTitle')}
              </div>
              <div className='space-y-3'>
                {queue.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className='flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300/70 bg-slate-50/80 px-4 py-3'
                  >
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-black text-slate-900'>
                        [{getSceneLabel(item.scene)}] {item.payload.rawCode}
                      </div>
                      <div className='text-xs font-medium text-slate-500'>
                        {t('terminalConfig.pdaShell.queue.pendingLine', {
                          attempts: item.attempts,
                          duplicates: item.duplicateCount,
                          error: item.lastError || t('terminalConfig.pdaShell.queue.waitingRetry'),
                        })}
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='rounded-full text-[10px] font-black uppercase tracking-widest'
                        onClick={() => void retryQueued(item.scene)}
                      >
                        <RefreshCw className='mr-1 size-3.5' />
                        {t('terminalConfig.pdaShell.actions.retry')}
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='rounded-full text-[10px] font-black uppercase tracking-widest'
                        onClick={() => {
                          void (async () => {
                            await removePDAShellRetry(item.id)
                            await refreshQueue()
                          })()
                        }}
                      >
                        {t('terminalConfig.pdaShell.actions.drop')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!lockMode && canOpenWorkbench ? (
          <div className='flex items-center justify-center'>
            <Button asChild variant='ghost' className='rounded-full text-[10px] font-black uppercase tracking-widest'>
              <Link to='/terminal-config/pda'>
                <MoveUpRight className='mr-2 size-3.5' />
                {t('terminalConfig.pdaShell.actions.backToWorkbench')}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
