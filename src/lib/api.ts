export type ApiFetchOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>
}

function buildUrl(input: string, params?: ApiFetchOptions['params']): string {
  if (!params) return input

  const url = new URL(input, window.location.origin)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

export async function apiFetch<T>(input: string, options: ApiFetchOptions = {}): Promise<T> {
  const { params, headers, ...init } = options
  const response = await fetch(buildUrl(input, params), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}
