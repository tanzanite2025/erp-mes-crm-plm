import { describe, expect, it } from 'vitest'
import {
  fromLogisticsProviderDto,
  toLogisticsProviderDraft,
  toLogisticsProviderPayload,
} from './logistics-provider-adapter'

describe('logistics-provider-adapter', () => {
  it('normalizes dto into stable frontend provider shape', () => {
    const provider = fromLogisticsProviderDto({
      id: 7,
      name: '  顺丰速运  ',
      code: ' sf ',
      category: undefined,
      website: undefined,
      contact: null as never,
      phone: '',
      note: undefined,
      appKey: ' token ',
      appSecret: ' secret ',
      customerId: undefined,
      checkWord: undefined,
      endpoint: ' https://api.example.com ',
      status: 'Enabled',
      capabilities: ['tracking', 'tracking', 'callback', 'unsupported'] as never,
      verificationStatus: 'reachable',
      referenceCount: 3,
      quotaAlertAt: undefined,
    })

    expect(provider.name).toBe('顺丰速运')
    expect(provider.code).toBe('SF')
    expect(provider.category).toBe('domestic')
    expect(provider.website).toBe('')
    expect(provider.contact).toBe('')
    expect(provider.appKey).toBe('token')
    expect(provider.appSecret).toBe('secret')
    expect(provider.endpoint).toBe('https://api.example.com')
    expect(provider.capabilities).toEqual(['tracking', 'callback'])
    expect(provider.quotaAlertAt).toBe(100)
  })

  it('builds payload from draft without server managed fields', () => {
    const payload = toLogisticsProviderPayload(
      toLogisticsProviderDraft({
        id: 9,
        name: 'JD',
        code: 'jd',
        category: 'domestic',
        endpoint: 'https://jd.example.com',
        appKey: 'key',
        appSecret: 'secret',
        customerId: 'customer-01',
        checkWord: 'check-01',
        status: 'Enabled',
        capabilities: ['tracking'],
        verificationStatus: 'healthy',
        lastVerificationMessage: 'ok',
        quotaTotal: 1000,
        quotaUsed: 10,
        quotaAlertAt: 80,
        referenceCount: 5,
      })
    )

    expect(payload).toEqual({
      id: 9,
      name: 'JD',
      code: 'JD',
      category: 'domestic',
      website: '',
      contact: '',
      phone: '',
      note: '',
      appKey: 'key',
      appSecret: 'secret',
      customerId: 'customer-01',
      checkWord: 'check-01',
      endpoint: 'https://jd.example.com',
      status: 'Enabled',
      capabilities: ['tracking'],
      quotaAlertAt: 80,
    })
  })
})
