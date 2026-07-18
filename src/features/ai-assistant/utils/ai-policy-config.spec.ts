import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AI_POLICY_CONFIG,
  resolveAiPolicyForEditing,
  sanitizeAiPolicyForSave,
} from './ai-policy-config'

describe('AI policy editing model', () => {
  it('fills gateway defaults and removes non-route permissions', () => {
    const policy = resolveAiPolicyForEditing(
      {
        enabled: false,
        allowedPermissions: ['tab_orders', 'action_order_create'],
        allowedUsers: ['admin'],
        api: {
          provider: 'openai',
          apiKey: 'secret',
          baseUrl: '',
          model: '',
        },
      },
      ['tab_orders']
    )

    expect(policy.enabled).toBe(false)
    expect(policy.allowedPermissions).toEqual(['tab_orders'])
    expect(policy.allowedUsers).toEqual(['admin'])
    expect(policy.api.provider).toBe('openai')
    expect(policy.api.groupId).toBe('')
  })

  it('sanitizes route permissions before persistence', () => {
    const policy = sanitizeAiPolicyForSave(
      {
        ...DEFAULT_AI_POLICY_CONFIG,
        allowedPermissions: ['tab_orders', 'menu_sales', 'unknown'],
      },
      ['tab_orders']
    )

    expect(policy.allowedPermissions).toEqual(['tab_orders'])
  })
})
