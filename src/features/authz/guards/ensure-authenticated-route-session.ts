import { redirect } from '@tanstack/react-router'
import { useAuthStore, waitForAuthHydration } from '@/stores/auth-store'

export async function ensureAuthenticatedRouteSession(pathname: string): Promise<void> {
  await waitForAuthHydration()

  const state = useAuthStore.getState()
  if (!state.accessToken) {
    throw redirect({
      to: '/sign-in',
      search: { redirect: pathname },
      replace: true,
    })
  }
}
