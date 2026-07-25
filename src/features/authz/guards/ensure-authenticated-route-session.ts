import { redirect } from '@tanstack/react-router'
import { useAuthStore, waitForAuthHydration } from '@/stores/auth-store'
import { isApiClientError } from '@/lib/api-error'
import { syncIdentitySnapshotFromProfile } from '@/features/authz/services/effective-permission-service'
import { matchesPathPermissionProjection } from './route-access'

function redirectToSignIn(pathname: string): never {
  throw redirect({
    to: '/sign-in',
    search: { redirect: pathname },
    replace: true,
  })
}

function shouldResetUnhydratedSession(error: unknown): boolean {
  if (!isApiClientError(error)) {
    return false
  }

  return (
    error.kind === 'auth_required' ||
    error.kind === 'network' ||
    error.kind === 'timeout' ||
    error.status === 401 ||
    error.status === 403 ||
    (typeof error.status === 'number' && error.status >= 500)
  )
}

export async function ensureAuthenticatedRouteSession(
  pathname: string
): Promise<void> {
  await waitForAuthHydration()

  let state = useAuthStore.getState()
  if (!state.accessToken) {
    redirectToSignIn(pathname)
  }

  if (!state.isIdentitySynced || !state.user) {
    try {
      await syncIdentitySnapshotFromProfile()
    } catch (error) {
      state = useAuthStore.getState()

      if (!state.user && shouldResetUnhydratedSession(error)) {
        state.reset()
        redirectToSignIn(pathname)
      }

      throw error
    }
    state = useAuthStore.getState()
  }

  if (!matchesPathPermissionProjection(state.user, pathname)) {
    throw redirect({
      to: '/403',
      replace: true,
    })
  }
}
