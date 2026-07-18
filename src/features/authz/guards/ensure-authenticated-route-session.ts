import { redirect } from '@tanstack/react-router'
import { useAuthStore, waitForAuthHydration } from '@/stores/auth-store'
import { syncIdentitySnapshotFromProfile } from '@/features/authz/services/effective-permission-service'
import { matchesPathPermissionProjection } from './route-access'

export async function ensureAuthenticatedRouteSession(
  pathname: string
): Promise<void> {
  await waitForAuthHydration()

  let state = useAuthStore.getState()
  if (!state.accessToken) {
    throw redirect({
      to: '/sign-in',
      search: { redirect: pathname },
      replace: true,
    })
  }

  if (!state.isIdentitySynced || !state.user) {
    await syncIdentitySnapshotFromProfile()
    state = useAuthStore.getState()
  }

  if (!matchesPathPermissionProjection(state.user, pathname)) {
    throw redirect({
      to: '/403',
      replace: true,
    })
  }
}
