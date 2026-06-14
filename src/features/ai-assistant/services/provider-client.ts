import { useAuthStore } from '@/stores/auth-store'
import { ensureCSRFToken } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { aiPolicyService } from './ai-policy-service'
import { parseStream } from './stream-parser'

const AI_CONFIG_KEY = 'xdfc_ai_capability_config'
const logger = createLogger('AiProviderClient')

type ProviderKind = 'gemini' | 'openai' | 'custom'

interface AiApiConfig {
  provider?: ProviderKind
  apiKey?: string
  baseUrl?: string
  model?: string
  groupId?: string
}

interface StoredConfig {
  api?: AiApiConfig
}

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
  api: Required<Pick<AiApiConfig, 'apiKey'>> & AiApiConfig
  provider: ProviderKind
  model: string
  baseUrl: string
}

function mergeApiConfig(
  local?: AiApiConfig,
  remote?: AiApiConfig
): AiApiConfig | undefined {
  if (!local && !remote) return undefined

  const localProvider = local?.provider
  const remoteProvider = remote?.provider
  const localApiKey = local?.apiKey?.trim()
  const remoteApiKey = remote?.apiKey?.trim()
  const localBaseUrl = local?.baseUrl?.trim()
  const remoteBaseUrl = remote?.baseUrl?.trim()
  const localModel = local?.model?.trim()
  const remoteModel = remote?.model?.trim()
  const localGroupId = local?.groupId?.trim()
  const remoteGroupId = remote?.groupId?.trim()

  return {
    provider: localProvider || remoteProvider,
    apiKey: localApiKey || remoteApiKey,
    baseUrl: localBaseUrl || remoteBaseUrl,
    model: localModel || remoteModel,
    groupId: localGroupId || remoteGroupId,
  }
}

function normalizeBaseUrl(provider: ProviderKind, baseUrl?: string): string {
  const fallback =
    provider === 'gemini'
      ? 'https://generativelanguage.googleapis.com'
      : 'https://api.openai.com'
  return (baseUrl || fallback).trim().replace(/\/+$/, '')
}

function resolveTargetUrl(baseUrl: string): string {
  const normalized = baseUrl.toLowerCase()
  if (normalized.includes('/chat/completions')) return baseUrl
  const hasV1 = normalized.endsWith('/v1')
  return `${baseUrl}${hasV1 ? '/chat/completions' : '/v1/chat/completions'}`
}

async function loadProviderContext(): Promise<ProviderContext> {
  const [localConfig, remoteConfig] = await Promise.all([
    StorageService.getItem<StoredConfig>(AI_CONFIG_KEY).catch(() => null),
    aiPolicyService.getPolicy().catch(() => null),
  ])

  const api = mergeApiConfig(localConfig?.api, remoteConfig?.api)
  if (!api?.apiKey) throw new Error('API_KEY_MISSING')

  if (
    (!localConfig?.api?.apiKey?.trim() || !localConfig?.api?.groupId?.trim()) &&
    api.apiKey
  ) {
    const nextConfig: StoredConfig = {
      ...(localConfig || {}),
      api,
    }
    void StorageService.setItem(AI_CONFIG_KEY, nextConfig).catch(
      () => undefined
    )
  }

  const provider: ProviderKind = api.provider || 'gemini'
  const model =
    api.model || (provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-3.5-turbo')
  const baseUrl = normalizeBaseUrl(provider, api.baseUrl)

  return {
    api: {
      ...api,
      apiKey: api.apiKey,
    },
    provider,
    model,
    baseUrl,
  }
}

function buildProxyAuthHeaders(api: AiApiConfig): Record<string, string> {
  const rawKey = (api.apiKey || '').trim()
  const authHeader = rawKey.toLowerCase().startsWith('bearer ')
    ? rawKey
    : `Bearer ${rawKey}`
  const headers: Record<string, string> = { Authorization: authHeader }

  if (api.groupId?.trim()) {
    headers['x-group-id'] = api.groupId.trim()
  }

  return headers
}

async function buildAIProxyRequestHeaders(): Promise<Record<string, string>> {
  const token = useAuthStore.getState().accessToken
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
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

function assertMiniMaxConfig(targetUrl: string, api: AiApiConfig): void {
  const normalized = targetUrl.toLowerCase()
  const isMiniMax =
    normalized.includes('minimaxi.com') || normalized.includes('minimax.io')
  if (isMiniMax && !api.groupId?.trim()) {
    throw new Error(
      '[CRITICAL] MiniMax target detected but Group ID is missing. Please configure it in AI settings.'
    )
  }
}

function mapProxyError(
  status: number,
  err: ProxyErrorPayload,
  apiKey: string
): string {
  let errorMsg =
    typeof err.error === 'object'
      ? JSON.stringify(err.error)
      : String(err.error || err.message || err.code || 'Unknown error')

  if (
    status === 401 &&
    (errorMsg.includes('2049') || JSON.stringify(err).includes('2049'))
  ) {
    const isTokenPlanKey = apiKey.trim().startsWith('sk-cp')
    errorMsg = isTokenPlanKey
      ? 'MiniMax auth failed: invalid API key or Group ID (code 2049).'
      : 'MiniMax billing mode mismatch: use token-plan key (sk-cp-...) for subscription mode (code 2049).'
  }

  if (
    status === 401 &&
    (errorMsg.includes('1004') || JSON.stringify(err).includes('1004'))
  ) {
    errorMsg =
      'MiniMax auth header is invalid (code 1004). Try base URL api.minimax.io and verify API key.'
  }

  if (status === 403 && err.code === 'AI_PROXY_TARGET_BLOCKED') {
    errorMsg =
      'Proxy blocked target host because resolved IP is private or blocked.'
  }

  return errorMsg
}

function buildRequestBody(
  model: string,
  messages: ChatMessage[],
  stream = false
): Record<string, unknown> {
  return {
    model,
    messages,
    temperature: 0.7,
    ...(stream ? { stream: true } : {}),
  }
}

/**
 * 指数退避重试封装 (Retry Wrapper)
 */
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const errorMessage = err instanceof Error ? err.message : String(err)
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
      throw err
    }
  }
  if (lastError instanceof Error) throw lastError
  throw new Error(String(lastError || 'AI_PROVIDER_RETRY_FAILED'))
}

export async function callProvider(messages: ChatMessage[]): Promise<string> {
  return callWithRetry(async () => {
    const { api, provider, model, baseUrl } = await loadProviderContext()

    if (provider === 'gemini') {
      const endpoint = `${baseUrl}/v1beta/models/${model}:generateContent`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      try {
        const response = await fetch('/api/v1/ai/proxy', {
          method: 'POST',
          headers: await buildAIProxyRequestHeaders(),
          credentials: 'include',
          signal: controller.signal,
          body: JSON.stringify({
            url: endpoint,
            method: 'POST',
            headers: { 'x-goog-api-key': api.apiKey },
            body: {
              contents: messages.map((m) => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
            },
          }),
        })

        if (!response.ok) {
          const err = await response
            .json()
            .catch(() => ({ error: { message: response.statusText } }))
          const errorMsg = mapProxyError(
            response.status,
            err as ProxyErrorPayload,
            api.apiKey
          )
          throw new Error(`AI_PROXY_ERROR (${response.status}): ${errorMsg}`)
        }

        const result = await response.json()
        return result.candidates?.[0]?.content?.parts?.[0]?.text || ''
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError')
          throw new Error('AI_TIMEOUT (30s)')
        throw err
      } finally {
        clearTimeout(timeoutId)
      }
    }

    if (provider === 'openai' || provider === 'custom') {
      const targetUrl = resolveTargetUrl(baseUrl)
      assertMiniMaxConfig(targetUrl, api)

      const proxyHeaders = buildProxyAuthHeaders(api)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      try {
        const response = await fetch('/api/v1/ai/proxy', {
          method: 'POST',
          headers: await buildAIProxyRequestHeaders(),
          credentials: 'include',
          signal: controller.signal,
          body: JSON.stringify({
            url: targetUrl,
            method: 'POST',
            headers: proxyHeaders,
            body: buildRequestBody(model, messages, false),
          }),
        })

        if (!response.ok) {
          const err = (await response.json().catch(() => ({
            error: { message: response.statusText },
          }))) as ProxyErrorPayload
          const errorMsg = mapProxyError(response.status, err, api.apiKey)
          throw new Error(`AI_PROXY_ERROR (${response.status}): ${errorMsg}`)
        }

        const result = await response.json()
        return result.choices?.[0]?.message?.content || ''
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError')
          throw new Error('AI_TIMEOUT (30s)')
        throw err
      } finally {
        clearTimeout(timeoutId)
      }
    }

    throw new Error('UNSUPPORTED_PROVIDER')
  })
}

export async function callProviderStream(
  messages: ChatMessage[],
  onChunk: (text: string) => void
): Promise<void> {
  return callWithRetry(async () => {
    const { api, provider, model, baseUrl } = await loadProviderContext()

    if (provider === 'gemini') {
      const reply = await callProvider(messages)
      const chunkSize = 15
      const chunkDelayMs = 18
      for (let i = 0; i < reply.length; i += chunkSize) {
        onChunk(reply.slice(i, i + chunkSize))
        await new Promise((resolve) => setTimeout(resolve, chunkDelayMs))
      }
      return
    }

    if (provider === 'openai' || provider === 'custom') {
      const targetUrl = resolveTargetUrl(baseUrl)
      assertMiniMaxConfig(targetUrl, api)

      const proxyHeaders = buildProxyAuthHeaders(api)

      const response = await fetch('/api/v1/ai/proxy', {
        method: 'POST',
        headers: await buildAIProxyRequestHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          url: targetUrl,
          method: 'POST',
          headers: proxyHeaders,
          body: buildRequestBody(model, messages, true),
        }),
      })

      if (!response.ok) {
        const err = (await response
          .json()
          .catch(() => ({ error: response.statusText }))) as ProxyErrorPayload
        const errorMsg = mapProxyError(response.status, err, api.apiKey)
        throw new Error(`AI_PROXY_ERROR (${response.status}): ${errorMsg}`)
      }

      if (!response.body) throw new Error('RESPONSE_BODY_EMPTY')
      await parseStream(response.body.getReader(), onChunk)
      return
    }

    throw new Error('UNSUPPORTED_PROVIDER')
  })
}
