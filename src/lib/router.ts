import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from '../routeTree.gen'

/**
 * 全局单例 Router 实例
 * 允许在非 React 环境下执导航 (如 handleServerError)
 */
export const router = createRouter({
  routeTree,
  context: {
    // 初始值会在 main.tsx 中被覆盖，或者通过 router.updateContext 注入真实实例
    queryClient: new QueryClient(),
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// 为类型安全进行声明
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
