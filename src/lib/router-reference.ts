export type AppRouterReference = {
  navigate: (options: { to: string; search?: Record<string, unknown> }) => unknown
  history: {
    location: {
      href: string
    }
  }
}

let appRouter: AppRouterReference | null = null

export function setAppRouter(router: AppRouterReference) {
  appRouter = router
}

export function getAppRouter() {
  return appRouter
}
