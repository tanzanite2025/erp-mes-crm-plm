import { useAuthStore } from '@/stores/auth-store'

export type ApiFetchOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>
}

function resolveApiPath(input: string): string {
  if (/^https?:\/\//i.test(input)) {
    return input
  }

  if (input.startsWith('/api/')) {
    return input
  }

  return `/api/v1${input.startsWith('/') ? input : `/${input}`}`
}

function buildUrl(input: string, params?: ApiFetchOptions['params']): string {
  const resolvedInput = resolveApiPath(input)
  if (!params) return resolvedInput

  const url = new URL(resolvedInput, window.location.origin)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

export async function apiFetch<T>(input: string, options: ApiFetchOptions = {}): Promise<T> {
  const { params, headers, ...init } = options
  const accessToken = useAuthStore.getState().accessToken
  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined ?? {}),
  }

  if (!(init.body instanceof FormData)) {
    requestHeaders['Content-Type'] = requestHeaders['Content-Type'] ?? 'application/json'
  }

  if (accessToken && !requestHeaders.Authorization) {
    requestHeaders.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(buildUrl(input, params), {
    ...init,
    headers: requestHeaders,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage = errorData.error || errorData.message || `Request failed: ${response.status} ${response.statusText}`
    throw new Error(errorMessage)
  }

  if (response.status === 204) return null as T
  return (await response.json()) as T
}
