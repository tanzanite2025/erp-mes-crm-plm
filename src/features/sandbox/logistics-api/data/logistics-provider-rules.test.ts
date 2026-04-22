import { describe, expect, it } from 'vitest'
import {
  createEmptyLogisticsProviderDraft,
} from '@/features/sandbox/logistics-api/data/logistics-provider-field-registry'
import {
  getLogisticsProviderCredentialSummary,
  getLogisticsProviderMissingCredentialFields,
  getLogisticsProviderRequiredCredentialFields,
  isLogisticsProviderCredentialsComplete,
} from './logistics-provider-rules'

describe('logistics-provider-rules', () => {
  it('requires appKey and appSecret for known provider profiles', () => {
    const provider = {
      ...createEmptyLogisticsProviderDraft(),
      code: 'SF',
      capabilities: ['tracking' as const],
      status: 'Enabled' as const,
      appKey: '',
      appSecret: '',
      customerId: '',
      checkWord: '',
    }

    expect(getLogisticsProviderRequiredCredentialFields(provider)).toEqual(['appKey', 'appSecret'])
    expect(getLogisticsProviderMissingCredentialFields(provider)).toEqual(['appKey', 'appSecret'])
    expect(isLogisticsProviderCredentialsComplete(provider)).toBe(false)
  })

  it('treats providers without capabilities as directory-only and not blocked by credential completeness', () => {
    const provider = {
      ...createEmptyLogisticsProviderDraft(),
      code: 'MANUAL',
      capabilities: [],
      status: 'Enabled' as const,
      appKey: '',
      appSecret: '',
      customerId: '',
      checkWord: '',
    }

    expect(getLogisticsProviderRequiredCredentialFields(provider)).toEqual([])
    expect(isLogisticsProviderCredentialsComplete(provider)).toBe(true)
    expect(getLogisticsProviderCredentialSummary(provider).visibleFields).toEqual(['appKey', 'appSecret', 'customerId', 'checkWord'])
  })
})
