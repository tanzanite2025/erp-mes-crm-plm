import { describe, expect, it } from 'vitest'
import { buildFallbackBusinessEventSources } from './use-business-event-sources'

describe('useBusinessEventSources fallback sources', () => {
  it('keeps default executable sources visible in fallback mode', () => {
    const sources = buildFallbackBusinessEventSources()

    expect(sources.map((item) => item.code)).toEqual([
      'SALES_ORDER',
      'PURCHASE_ORDER',
      'PRODUCTION_PLAN',
      'PRODUCTION_TASK',
    ])
  })
})
