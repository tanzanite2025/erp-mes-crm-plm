import { useAuthStore } from '@/stores/auth-store'
import { ensureCSRFToken } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { findRoutePermissionEntry } from '@/features/authz/data/route-permission-queries'
import { aiPolicyService } from './ai-policy-service'
import { parseStream } from './stream-parser'

const logger = createLogger('AiProviderClient')

type ProviderKind = 'gemini' | 'openai' | 'custom'

interface ProxyErrorPayload {
  code?: string
  error?: unknown
  message?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ProviderContext {
  provider: ProviderKind
}

const AI_PROXY_NON_RETRYABLE_CODES = new Set([
  'AI_CAPABILITY_DISABLED',
  'API_KEY_MISSING',
  'AI_ROUTE_PERMISSION_MISSING',
  'AI_POLICY_FORBIDDEN',
  'AI_PROXY_BODY_TOO_LARGE',
  'AI_PROXY_BAD_MESSAGES',
  'AI_PROXY_CONCURRENCY_LIMIT',
  'AI_PROXY_GLOBAL_RATE_LIMIT',
  'AI_PROXY_USER_RATE_LIMIT',
])

const AI_PROXY_STREAM_TIMEOUT_MS = 120_000

async function loadProviderContext(): Promise<ProviderContext> {
  const policy = await aiPolicyService.getRuntimePolicy()
  if (!policy.enabled) throw new Error('AI_CAPABILITY_DISABLED')
  if (!policy.api.configured) throw new Error('API_KEY_MISSING')

  return {
    provider: policy.api.provider,
  }
}

function getCurrentRoutePermissionID(): string {
  if (typeof window === 'undefined') {
    throw new Error('AI_ROUTE_PERMISSION_MISSING')
  }
  const permissionID = findRoutePermissionEntry(
    window.location.pathname
  )?.permissionId
  if (!permissionID) {
    throw new Error('AI_ROUTE_PERMISSION_MISSING')
  }
  return permissionID
}

async function buildAIProxyRequestHeaders(): Promise<Record<string, string>> {
  const token = useAuthStore.getState().accessToken
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-AI-Route-Permission': getCurrentRoutePermissionID(),
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const csrfToken = await ensureCSRFToken('')
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }
  return headers
}

export function toAIUserFacingErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('API_KEY_MISSING')) {
    return 'AI 功能已启用，但引擎网关还没有配置 API Key。请到「系统管理 / AI 能力」完成引擎网关配置后再使用。'
  }
  if (message.includes('AI_CAPABILITY_DISABLED')) {
    return 'AI 全局能力尚未启用，请先在「系统管理 / AI 能力」中开启。'
  }
  if (message.includes('AI_ROUTE_PERMISSION_MISSING')) {
    return '当前页面还没有登记到路由权限表，暂不能使用页面级 AI 能力。'
  }
  if (message.includes('AI_POLICY_FORBIDDEN')) {
    return '当前页面没有下发 AI 能力，请到「系统管理 / AI 能力」中为该页面授权。'
  }
  if (
    message.includes('AI_PROXY_CONCURRENCY_LIMIT') ||
    message.includes('AI_PROXY_GLOBAL_RATE_LIMIT') ||
    message.includes('AI_PROXY_USER_RATE_LIMIT') ||
    message.includes('429')
  ) {
    return 'AI 请求过于频繁，系统已自动限流保护。请稍后再试，避免连续点击或多窗口同时调用。'
  }
  if (
    message.includes('AI_TIMEOUT') ||
    message.includes('AbortError') ||
    message.includes('TIMEOUT')
  ) {
    return 'AI 上游响应超时，本次请求已中断。请稍后重试，或检查当前模型/网关网络状态。'
  }
  if (message.includes('AI_PROXY_TARGET_BLOCKED')) {
    return '当前 AI 网关地址被服务器安全策略拦截，请检查引擎网关配置的域名。'
  }
  if (message.includes('AI_PROXY_BODY_TOO_LARGE')) {
    return '本次发送给 AI 的上下文过大，已被系统拦截。请减少页面上下文或缩短问题后重试。'
  }
  if (message.includes('AI_PROXY_BAD_MESSAGES')) {
    return '本次 AI 消息格式不符合系统限制，请缩短内容或重新输入。'
  }
  if (
    message.includes('AI_PROXY_ERROR') ||
    message.includes('FETCH_FAILED') ||
    message.includes('Failed to fetch')
  ) {
    return 'AI 网关暂时不可用，请检查网络、模型服务或服务器代理状态后重试。'
  }
  return message || 'AI 服务暂时不可用，请稍后重试。'
}

function mapProxyError(status: number, error: ProxyErrorPayload): string {
  let errorMessage =
    typeof error.error === 'object'
      ? JSON.stringify(error.error)
      : String(error.error || error.message || error.code || 'Unknown error')

  if (
    status === 401 &&
    (errorMessage.includes('2049') || JSON.stringify(error).includes('2049'))
  ) {
    errorMessage =
      'MiniMax authentication failed. Verify the API key, billing mode, and Group ID (code 2049).'
  }

  if (
    status === 401 &&
    (errorMessage.includes('1004') || JSON.stringify(error).includes('1004'))
  ) {
    errorMessage =
      'MiniMax authentication header is invalid. Verify the configured gateway and API key (code 1004).'
  }

  if (status === 403 && error.code === 'AI_PROXY_TARGET_BLOCKED') {
    errorMessage =
      'The server blocked the configured AI gateway target for security reasons.'
  }

  return errorMessage
}

async function callWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const statusMatch = errorMessage.match(/\((\d+)\)/)
      const status = statusMatch ? parseInt(statusMatch[1], 10) : null
      const errorCodeMatch = errorMessage.match(/\bAI_[A-Z0-9_]+\b/)
      const errorCode = errorCodeMatch?.[0]
      const isNonRetryable =
        (errorCode && AI_PROXY_NON_RETRYABLE_CODES.has(errorCode)) ||
        status === 400 ||
        status === 401 ||
        status === 403 ||
        status === 413 ||
        status === 429

      const isRetryable =
        !isNonRetryable &&
        (status === 502 ||
          status === 503 ||
          status === 504 ||
          errorMessage.includes('FETCH_FAILED') ||
          errorMessage.includes('TIMEOUT'))

      if (attempt < maxRetries && isRetryable) {
        const delay = baseDelay * Math.pow(2, attempt)
        logger.warn(
          `Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
          errorMessage
        )
        await new Promise<void>((resolve) => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }
  if (lastError instanceof Error) throw lastError
  throw new Error(String(lastError || 'AI_PROVIDER_RETRY_FAILED'))
}

async function readProxyError(response: Response): Promise<string> {
  const error = (await response.json().catch(() => ({
    error: response.statusText,
  }))) as ProxyErrorPayload
  const mappedMessage = mapProxyError(response.status, error)
  return error.code ? `${error.code}: ${mappedMessage}` : mappedMessage
}

export async function callProvider(messages: ChatMessage[]): Promise<string> {
  return callWithRetry(async () => {
    const { provider } = await loadProviderContext()
    const controller = new AbortController()
    const timeoutID = setTimeout(() => controller.abort(), 30000)

    try {
      const response = await fetch('/api/v1/ai/proxy', {
        method: 'POST',
        headers: await buildAIProxyRequestHeaders(),
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({ messages, stream: false }),
      })

      if (!response.ok) {
        const errorMessage = await readProxyError(response)
        throw new Error(`AI_PROXY_ERROR (${response.status}): ${errorMessage}`)
      }

      const result = await response.json()
      if (provider === 'gemini') {
        return result.candidates?.[0]?.content?.parts?.[0]?.text || ''
      }
      return result.choices?.[0]?.message?.content || ''
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('AI_TIMEOUT (30s)')
      }
      throw error
    } finally {
      clearTimeout(timeoutID)
    }
  })
}

export async function callProviderStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void
): Promise<void> {
  return callWithRetry(async () => {
    const { provider } = await loadProviderContext()

    if (provider === 'gemini') {
      const reply = await callProvider(messages)
      const chunkSize = 15
      const chunkDelayMs = 18
      for (let index = 0; index < reply.length; index += chunkSize) {
        onChunk(reply.slice(index, index + chunkSize))
        await new Promise((resolve) => setTimeout(resolve, chunkDelayMs))
      }
      return
    }

    const controller = new AbortController()
    const timeoutID = setTimeout(
      () => controller.abort(),
      AI_PROXY_STREAM_TIMEOUT_MS
    )

    try {
      const response = await fetch('/api/v1/ai/proxy', {
        method: 'POST',
        headers: await buildAIProxyRequestHeaders(),
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({ messages, stream: true }),
      })

      if (!response.ok) {
        const errorMessage = await readProxyError(response)
        throw new Error(`AI_PROXY_ERROR (${response.status}): ${errorMessage}`)
      }
      if (!response.body) throw new Error('RESPONSE_BODY_EMPTY')
      await parseStream(response.body.getReader(), onChunk)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('AI_TIMEOUT (120s)')
      }
      throw error
    } finally {
      clearTimeout(timeoutID)
    }
  })
}
