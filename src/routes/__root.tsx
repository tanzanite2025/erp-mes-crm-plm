import { type QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useLocation } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { useAuthStore } from '@/stores/auth-store'
import { useEffect } from 'react'
import { PersistenceService } from '@/features/system-mgmt/services/persistence-service'
import { SearchProvider } from '@/context/search-provider'
import { createLogger } from '@/lib/logger'

const logger = createLogger('RootRoute')

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: () => {
    const { pathname } = useLocation()
    const isAuthPage = pathname.includes('/sign-in') || pathname.includes('/forgot-password')
    
    // 【性能优化】拆分选择器以避免因返回对象字面量导致的渲染死循环
    const user = useAuthStore((state) => state.user)
    const reset = useAuthStore((state) => state.reset)

    useEffect(() => {
      // 1. 启动即执行本地存储健康检查 (非阻塞)
      PersistenceService.initLocalStore();

      // 2. 【路由守卫】仅在非认证页面且检测到非法访客身份时才重定向
      if (!isAuthPage && user && user.accountNo === 'ACC-GUEST') {
        logger.warn('Illegal guest session on protected route, redirecting')
        reset()
        window.location.href = '/sign-in'
        return
      }

      // 3. 【按需同步】仅在已登录且非认证页面时启动云端同步
      if (!isAuthPage && user && user.accountNo !== 'ACC-GUEST') {
        PersistenceService.initCloudSync().catch(e => {
          logger.error('Cloud sync failed', e)
        });
      }
    }, [isAuthPage, user, reset])

    return (
      <SearchProvider>
        <NavigationProgress />
        <Outlet />
        <Toaster duration={2000} position="bottom-right" />
      </SearchProvider>
    )
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
