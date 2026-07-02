const PREPREG_BINDING_TOKEN_PREFIX = 'PREPREG-BIND-'
const PREPREG_BINDING_TOKEN_PARSE_BASE_URL = 'https://erp.invalid'

function normalizePrepregBindingToken(value: string): string {
  return value.trim().toUpperCase()
}

export function isPrepregBindingToken(value: string): boolean {
  return /^PREPREG-BIND-[A-Z0-9-]+$/.test(normalizePrepregBindingToken(value))
}

export function extractPrepregBindingToken(input: string): string {
  const raw = input.trim()
  if (!raw) return ''

  const normalized = normalizePrepregBindingToken(raw)
  if (isPrepregBindingToken(normalized)) return normalized

  try {
    const baseOrigin =
      typeof window !== 'undefined'
        ? window.location.origin
        : PREPREG_BINDING_TOKEN_PARSE_BASE_URL
    const url = new URL(raw, baseOrigin)
    const bindToken = normalizePrepregBindingToken(
      url.searchParams.get('bindToken') || ''
    )
    if (isPrepregBindingToken(bindToken)) return bindToken
  } catch {
    return ''
  }

  return ''
}

export function buildPrepregBindingQrDeepLink(token: string): string {
  const normalizedToken = normalizePrepregBindingToken(token)
  const path = `/raw-materials/catalog?bindToken=${encodeURIComponent(normalizedToken)}`
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

export { PREPREG_BINDING_TOKEN_PREFIX }
