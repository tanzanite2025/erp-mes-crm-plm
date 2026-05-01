import { DEFAULT_LOCALE, translate } from '@/locales'
import { describe, expect, it } from 'vitest'
import {
  resolveRecentVisitFallbackLabel,
  resolveRecentVisitLabelKey,
} from './recent-visit-labels'

describe('recent visit labels', () => {
  it('uses leaf tab labels instead of parent module labels', () => {
    expect(resolveRecentVisitLabelKey('/dashboard/overview')).toBe(
      'dashboard.page.tabs.overview'
    )
    expect(resolveRecentVisitFallbackLabel('/dashboard/overview')).toBe(
      translate(DEFAULT_LOCALE, 'dashboard.page.tabs.overview')
    )
  })

  it('localizes material archive static and dynamic tab paths', () => {
    expect(resolveRecentVisitLabelKey('/materials/all')).toBe(
      'materialArchive.layout.tabs.all'
    )
    expect(resolveRecentVisitLabelKey('/materials/assembly')).toBe(
      'materialArchive.layout.tabs.assembly'
    )
    expect(resolveRecentVisitLabelKey('/materials/RAW_MATERIAL')).toBe(
      'materialArchive.form.fallbackCategories.rawMaterial'
    )
  })

  it('localizes purchase module child routes through the shared route label registry', () => {
    expect(resolveRecentVisitLabelKey('/purchase/suppliers')).toBe(
      'purchase.tabs.suppliers'
    )
    expect(resolveRecentVisitFallbackLabel('/purchase/suppliers')).toBe(
      translate(DEFAULT_LOCALE, 'purchase.tabs.suppliers')
    )
    expect(resolveRecentVisitLabelKey('/purchase/orders')).toBe(
      'purchase.tabs.orders'
    )
    expect(resolveRecentVisitLabelKey('/purchase/payables')).toBe(
      'purchase.tabs.payables'
    )
  })
})
