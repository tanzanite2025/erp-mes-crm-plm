import { lazy, Suspense, useEffect, useState, startTransition } from 'react'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SkipToMain } from '@/components/skip-to-main'
import { useNotifications } from '@/hooks/use-notifications'
import { useSystemMonitor } from '@/features/system-mgmt/monitor/hooks/use-system-monitor'
import { useAuthStore } from '@/stores/auth-store'
import { syncIdentitySnapshotFromProfile } from '@/features/authz/services/effective-permission-service'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AuthenticatedLayout')

const NotificationCenter = lazy(() =>
  import('@/features/system-mgmt/notifications/components/notification-center').then((module) => ({
    default: module.NotificationCenter,
  }))
)

const SystemAnomalyBanner = lazy(() =>
  import('@/features/system-mgmt/monitor/components/system-anomaly-banner').then((module) => ({
    default: module.SystemAnomalyBanner,
  }))
)

const AIAssistant = lazy(() => import('@/features/ai-assistant'))

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
  const { accessToken, isIdentitySynced, isSyncing, setIsSyncing } = useAuthStore()
  const shouldSyncIdentity = !!accessToken && !isIdentitySynced
  
  useNotifications()
  useSystemMonitor()

  const isPDAShellRoute = pathname === '/pda-shell'
  const showDeferredWidgets = useDeferredActivation(!isPDAShellRoute, 250)
  const showAssistant = useDeferredActivation(!isPDAShellRoute, 1000)

  // --- 强一致性身份同步 ---
  useEffect(() => {
    const checkAndSync = async () => {
      if (shouldSyncIdentity) {
        setIsSyncing(true)
        try {
          await syncIdentitySnapshotFromProfile()
        } catch (error: any) {
          logger.error('[CRITICAL] Background identity sync failed. Redirecting to sign-in.', error)
          // 强制重置局部同步状态，并退回登录页，避免用户停留在加载死循环
          setIsSyncing(false)
          navigate({ to: '/sign-in', replace: true })
        } finally {
          setIsSyncing(false)
        }
      } else if (!accessToken) {
        navigate({ to: '/sign-in' })
      }
    }

    void checkAndSync()
  }, [accessToken, navigate, setIsSyncing, shouldSyncIdentity])

  const defaultOpen = getCookie('sidebar_state') !== 'false'

  if (shouldSyncIdentity || isSyncing) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background px-6'>
        <div className='flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-dashed border-muted/50 bg-muted/5 px-8 py-10 text-center'>
          <div className='size-12 animate-spin rounded-full border-2 border-primary/20 border-t-primary' />
          <div className='space-y-2'>
            <p className='text-sm font-black uppercase tracking-widest text-foreground'>
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
      <SidebarProvider defaultOpen={defaultOpen} data-layout='fixed'>
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
            isPDAShellRoute ? 'pt-0' : 'pt-14 md:pt-16',
            !isPDAShellRoute &&
              'peer-data-[variant=inset]:mx-2 peer-data-[variant=inset]:mb-2 peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm'
          )}
        >
          {children ?? <Outlet />}
        </SidebarInset>
        {showDeferredWidgets && (
          <Suspense fallback={null}>
            <NotificationCenter />
          </Suspense>
        )}
        {showAssistant && (
          <Suspense fallback={null}>
            <AIAssistant />
          </Suspense>
        )}
      </SidebarProvider>
    </LayoutProvider>
  )
}
