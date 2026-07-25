import {
  lazy,
  Suspense,
  useEffect,
  useState,
  startTransition,
  useCallback,
} from 'react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { getCookie } from '@/lib/cookies'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { useNotifications } from '@/hooks/use-notifications'
import { Button } from '@/components/ui/button'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { DashboardDockButton } from '@/components/layout/dashboard-dock-button'
import { GlobalBottomDock } from '@/components/layout/global-bottom-dock'
import { Search } from '@/components/search'
import { SkipToMain } from '@/components/skip-to-main'
import { syncIdentitySnapshotFromProfile } from '@/features/authz/services/effective-permission-service'
import { QuickActionsFloating } from '@/features/quick-actions'
import { useRecentVisitTracker } from '@/features/recent-visits'
import { useSystemMonitor } from '@/features/system-mgmt/monitor/hooks/use-system-monitor'

const logger = createLogger('AuthenticatedLayout')
const DESKTOP_SIDEBAR_SCRUBBER_WIDTH = '3.75rem'

const SystemAnomalyBanner = lazy(() =>
  import('@/features/system-mgmt/monitor/components/system-anomaly-banner').then(
    (module) => ({
      default: module.SystemAnomalyBanner,
    })
  )
)

const AIAssistant = lazy(() => import('@/features/ai-assistant'))

const NotificationCenter = lazy(() =>
  import('@/features/system-mgmt/notifications/components/notification-center').then(
    (module) => ({
      default: module.NotificationCenter,
    })
  )
)

const PersonalWorkbenchBottomDrawer = lazy(() =>
  import('@/features/personal-workbench/components/personal-workbench-bottom-drawer').then(
    (module) => ({
      default: module.PersonalWorkbenchBottomDrawer,
    })
  )
)

function useDeferredActivation(enabled: boolean, delayMs = 0) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!enabled) {
      const resetTimer = globalThis.setTimeout(() => {
        startTransition(() => {
          setActive(false)
        })
      }, 0)

      return () => {
        globalThis.clearTimeout(resetTimer)
      }
    }

    if (active) {
      return
    }

    const activate = () => {
      startTransition(() => {
        setActive(true)
      })
    }

    if (typeof window === 'undefined') {
      activate()
      return
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    if ('requestIdleCallback' in globalThis) {
      const idleId = globalThis.requestIdleCallback(
        () => {
          if (delayMs > 0) {
            timeoutId = globalThis.setTimeout(activate, delayMs)
            return
          }
          activate()
        },
        { timeout: 1500 }
      )

      return () => {
        globalThis.cancelIdleCallback(idleId)
        if (timeoutId !== null) {
          globalThis.clearTimeout(timeoutId)
        }
      }
    }

    timeoutId = globalThis.setTimeout(activate, delayMs)
    return () => {
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId)
      }
    }
  }, [active, enabled, delayMs])

  return active
}

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

type IdentitySyncGateState =
  | { status: 'idle' }
  | { status: 'syncing' }
  | { status: 'error'; error: Error }

/**
 * 有效身份增强布局 (Security Sync Gate)
 * 职责：
 * 1. 拦截未同步身份：如果内存中没有 User 对象但存在 Token，强制阻塞渲染并由后端同步权限。
 * 2. 禁止 UI 闪烁：在身份确认前，展示品牌加固的加载界面。
 * 3. 强制退场：若 Token 无效或后端拒绝 Profile 同步，强制跳转至登录页。
 */
export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { accessToken, isIdentitySynced, isSyncing, setIsSyncing } =
    useAuthStore()
  const shouldSyncIdentity = !!accessToken && !isIdentitySynced
  const [syncGateState, setSyncGateState] = useState<IdentitySyncGateState>(
    () => (shouldSyncIdentity ? { status: 'syncing' } : { status: 'idle' })
  )

  useNotifications()
  useSystemMonitor()
  useRecentVisitTracker()

  const isPDAShellRoute = pathname === '/pda-shell'
  const showAssistant = useDeferredActivation(!isPDAShellRoute, 1000)

  const runIdentitySync = useCallback(async () => {
    if (!shouldSyncIdentity) {
      setSyncGateState({ status: 'idle' })
      return
    }

    setSyncGateState({ status: 'syncing' })
    setIsSyncing(true)
    try {
      await syncIdentitySnapshotFromProfile()
      setSyncGateState({ status: 'idle' })
    } catch (error: unknown) {
      const normalizedError =
        error instanceof Error ? error : new Error('身份权限同步失败')
      logger.error(
        '[CRITICAL] Background identity sync failed. Showing retry gate.',
        normalizedError
      )
      setSyncGateState({ status: 'error', error: normalizedError })
    } finally {
      setIsSyncing(false)
    }
  }, [setIsSyncing, shouldSyncIdentity])

  // --- 强一致性身份同步 ---
  useEffect(() => {
    if (!accessToken) {
      setSyncGateState({ status: 'idle' })
      navigate({ to: '/sign-in', replace: true })
      return
    }

    if (!shouldSyncIdentity) {
      setSyncGateState({ status: 'idle' })
      return
    }

    if (syncGateState.status === 'error') {
      return
    }

    void runIdentitySync()
  }, [
    accessToken,
    navigate,
    runIdentitySync,
    shouldSyncIdentity,
    syncGateState.status,
  ])

  const sidebarStateCookie = getCookie('sidebar_state')
  const defaultOpen =
    sidebarStateCookie === undefined ? false : sidebarStateCookie === 'true'
  const sidebarProviderStyle = {
    '--sidebar-gutter-width': isPDAShellRoute
      ? '0px'
      : DESKTOP_SIDEBAR_SCRUBBER_WIDTH,
  } as React.CSSProperties

  if (syncGateState.status === 'error') {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background px-6'>
        <div className='flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-dashed border-rose-500/25 bg-rose-500/5 px-8 py-10 text-center'>
          <div className='size-12 rounded-full border-2 border-rose-500/20 border-t-rose-500' />
          <div className='space-y-2'>
            <p className='text-sm font-black tracking-widest text-rose-700 uppercase'>
              身份权限同步失败
            </p>
            <p className='text-xs font-bold text-rose-700/80'>
              {syncGateState.error.message ||
                '当前无法完成登录后身份快照同步，请重试或返回登录页。'}
            </p>
          </div>
          <div className='flex flex-col gap-3 sm:flex-row'>
            <Button
              type='button'
              className='h-11 rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
              onClick={() => {
                void runIdentitySync()
              }}
            >
              重试同步
            </Button>
            <Button
              type='button'
              variant='outline'
              className='h-11 rounded-full border-dashed px-6 text-[10px] font-black tracking-widest uppercase'
              onClick={() => {
                navigate({ to: '/sign-in', replace: true })
              }}
            >
              返回登录
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (syncGateState.status === 'syncing' || shouldSyncIdentity || isSyncing) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background px-6'>
        <div className='flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-dashed border-muted/50 bg-muted/5 px-8 py-10 text-center'>
          <div className='size-12 animate-spin rounded-full border-2 border-primary/20 border-t-primary' />
          <div className='space-y-2'>
            <p className='text-sm font-black tracking-widest text-foreground uppercase'>
              正在等待后端同步身份权限
            </p>
            <p className='text-xs font-bold text-muted-foreground'>
              当前页面将仅在服务端返回最新身份与权限快照后继续渲染
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <LayoutProvider>
      <SidebarProvider
        defaultOpen={defaultOpen}
        data-layout='fixed'
        style={sidebarProviderStyle}
      >
        {!isPDAShellRoute && (
          <Suspense fallback={null}>
            <SystemAnomalyBanner />
          </Suspense>
        )}
        <SkipToMain />
        {!isPDAShellRoute && <AppSidebar />}
        <SidebarInset
          className={cn(
            '@container/content',
            'min-h-0 w-full bg-background',
            isPDAShellRoute
              ? 'pt-0'
              : 'pt-14 pb-[calc(env(safe-area-inset-bottom)+4rem)] md:pt-16 md:pb-16',
            !isPDAShellRoute &&
              'peer-data-[variant=inset]:mx-2 peer-data-[variant=inset]:mb-2 peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm'
          )}
        >
          {children ?? <Outlet />}
        </SidebarInset>
        {!isPDAShellRoute && (
          <GlobalBottomDock>
            <DashboardDockButton />
            <QuickActionsFloating placement='dock' />
            <Search placement='dock' />
            <Suspense fallback={null}>
              <NotificationCenter placement='dock' />
            </Suspense>
            {showAssistant && (
              <Suspense fallback={null}>
                <AIAssistant placement='dock' />
              </Suspense>
            )}
          </GlobalBottomDock>
        )}
        <Suspense fallback={null}>
          <PersonalWorkbenchBottomDrawer />
        </Suspense>
      </SidebarProvider>
    </LayoutProvider>
  )
}
