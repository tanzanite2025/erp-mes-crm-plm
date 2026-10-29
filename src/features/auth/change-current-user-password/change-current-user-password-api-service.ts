import { apiFetch } from '@/lib/api-client'
import { createApiClientError } from '@/lib/api-error'

export async function changeCurrentAuthenticatedUserPassword(passwords: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  const endpoint = '/auth/change-password'
  const response = await apiFetch<unknown>(endpoint, {
    method: 'POST',
    body: JSON.stringify(passwords),
    suppressErrorStatuses: [422, 429],
  })
  if (
    !response ||
    typeof response !== 'object' ||
    !('status' in response) ||
    response.status !== 'ok' ||
    !('requiresSignIn' in response) ||
    response.requiresSignIn !== true
  ) {
    throw createApiClientError({
      kind: 'invalid_response',
      message: 'Password change result could not be confirmed',
      endpoint,
    })
  }
}
