const AI_CONTEXT_MAX_DEPTH = 5
const AI_CONTEXT_MAX_OBJECT_KEYS = 60
const AI_CONTEXT_MAX_ARRAY_ITEMS = 20
const AI_CONTEXT_MAX_STRING_CHARS = 300
const AI_CONTEXT_MAX_NODES = 500

export const AI_CONTEXT_REDACTED_VALUE = '[AI_CONTEXT_REDACTED]'
export const AI_CONTEXT_TRUNCATED_VALUE = '[AI_CONTEXT_TRUNCATED]'

const SENSITIVE_KEY_PATTERN =
  /(?:password|passwd|pwd|secret|token|api[_-]?key|authorization|cookie|credential|session|idcard|id_card|bankcard|bank_card|mobile|phone|email|address)/i

export type AiSafePageContext = Record<string, unknown>

interface SanitizeState {
  visitedNodes: number
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function normalizeContextString(value: string): string {
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  if (normalized.length <= AI_CONTEXT_MAX_STRING_CHARS) return normalized
  return `${normalized.slice(0, AI_CONTEXT_MAX_STRING_CHARS)}…`
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key)
}

function sanitizeAiValue(
  value: unknown,
  key: string,
  depth: number,
  state: SanitizeState
): unknown {
  if (key && isSensitiveKey(key)) return AI_CONTEXT_REDACTED_VALUE
  if (state.visitedNodes >= AI_CONTEXT_MAX_NODES) {
    return AI_CONTEXT_TRUNCATED_VALUE
  }
  state.visitedNodes += 1

  if (value == null) return value
  if (typeof value === 'string') return normalizeContextString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'function' || typeof value === 'symbol') {
    return AI_CONTEXT_TRUNCATED_VALUE
  }
  if (depth >= AI_CONTEXT_MAX_DEPTH) return AI_CONTEXT_TRUNCATED_VALUE

  if (Array.isArray(value)) {
    const items = value
      .slice(0, AI_CONTEXT_MAX_ARRAY_ITEMS)
      .map((item) => sanitizeAiValue(item, '', depth + 1, state))
    if (value.length > AI_CONTEXT_MAX_ARRAY_ITEMS) {
      items.push(
        `[AI_CONTEXT_TRUNCATED_ITEMS:${value.length - AI_CONTEXT_MAX_ARRAY_ITEMS}]`
      )
    }
    return items
  }

  if (!isPlainObject(value)) return normalizeContextString(String(value))

  const entries = Object.entries(value)
  const safeEntries = entries.slice(0, AI_CONTEXT_MAX_OBJECT_KEYS)
  const output: AiSafePageContext = {}
  for (const [entryKey, entryValue] of safeEntries) {
    const normalizedKey = normalizeContextString(entryKey)
    if (!normalizedKey) continue
    output[normalizedKey] = sanitizeAiValue(
      entryValue,
      normalizedKey,
      depth + 1,
      state
    )
  }
  if (entries.length > AI_CONTEXT_MAX_OBJECT_KEYS) {
    output.__truncatedKeys = entries.length - AI_CONTEXT_MAX_OBJECT_KEYS
  }
  return output
}

export function normalizeAiContextTitle(title: string): string {
  const normalized = normalizeContextString(title)
  return normalized || '页面上下文'
}

export function buildSafeAiPageContext(
  data: Record<string, unknown>
): AiSafePageContext {
  const sanitized = sanitizeAiValue(data, '', 0, { visitedNodes: 0 })
  if (isPlainObject(sanitized)) return sanitized
  return { value: sanitized }
}
