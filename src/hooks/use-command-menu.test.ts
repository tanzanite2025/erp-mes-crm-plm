import { describe, expect, it } from 'vitest'
import { normalizeSearchHref } from '@/components/layout/data/search-href'

describe('normalizeSearchHref', () => {
  it('maps retired routing entries to message center rules', () => {
    expect(normalizeSearchHref('/system-management/routing')).toBe(
      '/message-center/rules'
    )
    expect(normalizeSearchHref('/approval/routing')).toBe('/message-center/rules')
  })

  it('keeps other search hrefs unchanged', () => {
    expect(normalizeSearchHref('/approval')).toBe('/approval')
    expect(normalizeSearchHref('/system-management')).toBe('/system-management')
  })
})
