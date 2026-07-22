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

export const aiPolicyService = {
  async getRuntimePolicy(): Promise<AiRuntimePolicy> {
    return apiFetch<AiRuntimePolicy>('/ai/policy')
  },

  async getPolicy(): Promise<AiPolicyConfig | null> {
    return apiFetch<AiPolicyConfig>('/ai/policy/admin')
  },

  async savePolicy(policy: AiPolicyConfig): Promise<void> {
    await apiFetch<AiPolicyConfig>('/ai/policy/admin', {
      method: 'POST',
      body: JSON.stringify(policy),
    })
  },
}
