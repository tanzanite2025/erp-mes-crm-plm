import { describe, expect, it } from 'vitest'
import {
  getLogisticsProviderCredentialSummary,
  getLogisticsProviderMissingCredentialFields,
  getLogisticsProviderRequiredCredentialFields,
  isLogisticsProviderCredentialsComplete,
} from './logistics-provider-rules'

describe('logistics-provider-rules', () => {
  it('requires appKey and appSecret for known provider profiles', () => {
    const provider = {
      code: 'SF',
      capabilities: ['tracking'],
      status: 'Enabled',
      appKey: '',
      appSecret: '',
      customerId: '',
      checkWord: '',
    } as const

    expect(getLogisticsProviderRequiredCredentialFields(provider)).toEqual(['appKey', 'appSecret'])
    expect(getLogisticsProviderMissingCredentialFields(provider)).toEqual(['appKey', 'appSecret'])
    expect(isLogisticsProviderCredentialsComplete(provider)).toBe(false)
  })

  it('treats providers without capabilities as directory-only and not blocked by credential completeness', () => {
    const provider = {
      code: 'MANUAL',
      capabilities: [],
      status: 'Enabled',
      appKey: '',
      appSecret: '',
      customerId: '',
      checkWord: '',
    } as const

    expect(getLogisticsProviderRequiredCredentialFields(provider)).toEqual([])
    expect(isLogisticsProviderCredentialsComplete(provider)).toBe(true)
    expect(getLogisticsProviderCredentialSummary(provider).visibleFields).toEqual(['appKey', 'appSecret', 'customerId', 'checkWord'])
  })
})
