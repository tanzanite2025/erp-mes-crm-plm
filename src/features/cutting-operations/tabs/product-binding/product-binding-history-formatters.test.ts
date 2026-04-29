import { describe, expect, it } from 'vitest'
import { formatProductBindingBoundAtLabel } from './product-binding-history-formatters'

describe('formatProductBindingBoundAtLabel', () => {
  it('returns placeholder for empty values', () => {
    expect(formatProductBindingBoundAtLabel('', 'zh-CN')).toBe('--')
    expect(formatProductBindingBoundAtLabel(undefined, 'en-US')).toBe('--')
  })

  it('returns original value when date parsing fails', () => {
    expect(formatProductBindingBoundAtLabel('not-a-date', 'zh-CN')).toBe('not-a-date')
  })

  it('formats valid date strings with locale-aware date time output', () => {
    const zhLabel = formatProductBindingBoundAtLabel('2026-04-30T08:15:00', 'zh-CN')
    const enLabel = formatProductBindingBoundAtLabel('2026-04-30T08:15:00', 'en-US')

    expect(zhLabel).toContain('2026')
    expect(zhLabel).toContain('08:15')
    expect(enLabel).toContain('2026')
    expect(enLabel).toContain('08:15')
  })
})
