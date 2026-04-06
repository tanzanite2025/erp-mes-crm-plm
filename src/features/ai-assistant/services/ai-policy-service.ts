import { apiFetch } from '@/lib/api-client'

export const AI_POLICY_CONFIG_KEY = 'ai_capability_policy'

export interface AiPolicyConfig {
  enabled: boolean
  allowedRoles: string[]
  allowedUsers?: string[]
  api?: {
    provider: 'gemini' | 'openai' | 'custom'
    apiKey: string
    baseUrl: string
    model: string
    groupId?: string
  }
}

interface SystemConfig {
  key: string
  value: string
  label: string
  description?: string
}

export const aiPolicyService = {
  async getPolicy(): Promise<AiPolicyConfig | null> {
    const configs = await apiFetch<SystemConfig[]>('/system/configs')
    const cfg = configs.find((c) => c.key === AI_POLICY_CONFIG_KEY)
    if (!cfg || !cfg.value?.trim()) return null
    try {
      return JSON.parse(cfg.value) as AiPolicyConfig
    } catch {
      return null
    }
  },

  async savePolicy(policy: AiPolicyConfig): Promise<void> {
    await apiFetch<SystemConfig>('/system/configs', {
      method: 'POST',
      body: JSON.stringify({
        key: AI_POLICY_CONFIG_KEY,
        value: JSON.stringify(policy),
        label: 'AI capability policy',
        description: 'Backend authoritative AI governance policy',
      }),
    })
  },
}
