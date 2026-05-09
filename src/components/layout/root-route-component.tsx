import { Outlet, useLocation } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import { SearchProvider } from '@/context/search-provider'
import { OfflineSyncBootstrapService } from '@/offline-sync/services/offline-sync-bootstrap-service'
import { PersistenceService } from '@/features/system-mgmt/services/persistence-service'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { OfflineSyncStatusBanner } from '@/offline-sync/components/offline-sync-status-banner'
import { useAuthStore } from '@/stores/auth-store'

const logger = createLogger('RootRoute')

/**
 * Root route shell that boots local persistence and global offline sync visibility.
 */
export function RootRouteComponent() {
  const { pathname } = useLocation()
  const isAuthPage = pathname.includes('/sign-in') || pathname.includes('/forgot-password')

  // 【性能优化】拆分选择器以避免因返回对象字面量导致的渲染死循环
  const user = useAuthStore((state) => state.user)
  const reset = useAuthStore((state) => state.reset)

  useEffect(() => {
    // 1. 启动即执行本地存储健康检查 (非阻塞)
    void PersistenceService.initLocalStore().catch((error) => {
      logger.error('Local persistence bootstrap failed', error)
    })

    // 2. 【路由守卫】仅在非认证页面且检测到非法访客身份时才重定向
    if (!isAuthPage && user && user.accountNo === 'ACC-GUEST') {
      logger.warn('Illegal guest session on protected route, redirecting')
      reset()
      window.location.href = '/sign-in'
      return
    }

    // 3. 【按需同步】仅在已登录且非认证页面时启动云端同步
    if (!isAuthPage && user && user.accountNo !== 'ACC-GUEST') {
      void OfflineSyncBootstrapService.ensureStarted().catch((error) => {
        logger.error('Cloud sync failed', error)
        failLoudly(error, 'RootRoute.initCloudSync')
      })
    }
  }, [isAuthPage, user, reset])

  return (
    <SearchProvider>
      <NavigationProgress />
      <OfflineSyncStatusBanner />
      <Outlet />
      <Toaster duration={2000} position='bottom-right' />
    </SearchProvider>
  )
}
