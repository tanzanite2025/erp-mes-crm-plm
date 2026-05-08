import { describe, expect, it } from 'vitest'
import { normalizeSearchHref } from './use-command-menu'

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
