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

      const isRetryable =
        status === 429 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        errorMessage.includes('FETCH_FAILED') ||
        errorMessage.includes('TIMEOUT')

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
  return mapProxyError(response.status, error)
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

    const response = await fetch('/api/v1/ai/proxy', {
      method: 'POST',
      headers: await buildAIProxyRequestHeaders(),
      credentials: 'include',
      body: JSON.stringify({ messages, stream: true }),
    })

    if (!response.ok) {
      const errorMessage = await readProxyError(response)
      throw new Error(`AI_PROXY_ERROR (${response.status}): ${errorMessage}`)
    }
    if (!response.body) throw new Error('RESPONSE_BODY_EMPTY')
    await parseStream(response.body.getReader(), onChunk)
  })
}
