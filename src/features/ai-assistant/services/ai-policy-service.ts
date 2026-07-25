import { apiFetch } from '@/lib/api-client'

export interface AiGatewayConfig {
  provider: 'gemini' | 'openai' | 'custom'
  apiKey: string
  baseUrl: string
  model: string
  groupId?: string
}

export interface AiPolicyConfig {
  enabled: boolean
  allowedPermissions: string[]
  api?: AiGatewayConfig
}

export interface AiRuntimePolicy {
  enabled: boolean
  allowedPermissions: string[]
  api: {
    provider: AiGatewayConfig['provider']
    model: string
    configured: boolean
  }
}

interface AiPolicyConfigApiDTO extends Omit<AiPolicyConfig, 'allowedPermissions'> {
  allowedPermissions?: string[] | null
}

interface AiRuntimePolicyApiDTO
  extends Omit<AiRuntimePolicy, 'allowedPermissions'> {
  allowedPermissions?: string[] | null
}

function normalizeAiAllowedPermissions(
  value: string[] | null | undefined
): string[] {
  return Array.isArray(value) ? value : []
}

function normalizeAiPolicyConfig(dto: AiPolicyConfigApiDTO): AiPolicyConfig {
  return {
    ...dto,
    allowedPermissions: normalizeAiAllowedPermissions(dto.allowedPermissions),
  }
}

function normalizeAiRuntimePolicy(
  dto: AiRuntimePolicyApiDTO
): AiRuntimePolicy {
  return {
    ...dto,
    allowedPermissions: normalizeAiAllowedPermissions(dto.allowedPermissions),
  }
}

export const aiPolicyService = {
  async getRuntimePolicy(): Promise<AiRuntimePolicy> {
    const response = await apiFetch<AiRuntimePolicyApiDTO>('/ai/policy')
    return normalizeAiRuntimePolicy(response)
  },

  async getPolicy(): Promise<AiPolicyConfig | null> {
    const response = await apiFetch<AiPolicyConfigApiDTO | null>(
      '/ai/policy/admin'
    )
    return response ? normalizeAiPolicyConfig(response) : null
  },

  async savePolicy(policy: AiPolicyConfig): Promise<void> {
    await apiFetch<AiPolicyConfig>('/ai/policy/admin', {
      method: 'POST',
      body: JSON.stringify(policy),
    })
  },
}
