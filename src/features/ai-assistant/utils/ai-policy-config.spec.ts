import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AI_POLICY_CONFIG,
  resolveAiPolicyForEditing,
  sanitizeAiPolicyForSave,
  toAiPolicySaveErrorMessage,
} from './ai-policy-config'

describe('AI policy editing model', () => {
  it('fills gateway defaults and removes non-route permissions', () => {
    const policy = resolveAiPolicyForEditing(
      {
        enabled: false,
        allowedPermissions: ['tab_orders', 'action_order_create'],
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
    expect(policy.api.provider).toBe('openai')
    expect(policy.api.groupId).toBe('')
  })

  it('sanitizes route permissions before persistence', () => {
    const policy = sanitizeAiPolicyForSave(
      {
        ...DEFAULT_AI_POLICY_CONFIG,
        allowedPermissions: [
          ' TAB_ORDERS ',
          'tab_orders',
          'menu_sales',
          'unknown',
        ],
      },
      ['tab_orders']
    )

    expect(policy.allowedPermissions).toEqual(['tab_orders'])
  })

  it('normalizes gateway drafts before persistence', () => {
    const policy = sanitizeAiPolicyForSave(
      {
        ...DEFAULT_AI_POLICY_CONFIG,
        api: {
          provider: 'openai',
          apiKey: '  secret  ',
          baseUrl: ' https://api.openai.com/v1/ ',
          model: '  ',
          groupId: '  group-1  ',
        },
      },
      []
    )

    expect(policy.api).toEqual({
      provider: 'openai',
      apiKey: 'secret',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      groupId: 'group-1',
    })
  })

  it('translates backend policy validation errors for administrators', () => {
    expect(
      toAiPolicySaveErrorMessage(
        new Error(
          'AI policy payload is invalid: gateway base URL must use HTTPS'
        )
      )
    ).toContain('HTTPS')

    expect(
      toAiPolicySaveErrorMessage(
        new Error(
          'AI policy payload is invalid: MiniMax gateway group ID is required'
        )
      )
    ).toContain('Group ID')
  })
})
