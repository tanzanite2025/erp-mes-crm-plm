import { describe, expect, it } from 'vitest'
import { normalizeSearchHref } from './use-command-menu'

describe('normalizeSearchHref', () => {
  it('maps the retired system-management routing entry to approval routing', () => {
    expect(normalizeSearchHref('/system-management/routing')).toBe(
      '/approval/routing'
    )
  })

  it('keeps other search hrefs unchanged', () => {
    expect(normalizeSearchHref('/approval')).toBe('/approval')
    expect(normalizeSearchHref('/system-management')).toBe('/system-management')
  })
})
