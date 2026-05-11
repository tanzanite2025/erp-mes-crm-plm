// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBOMFormOptions } from './use-bom-form-options'
import { useBOMReferenceResource } from './use-bom-reference-resource'

const {
  useBOMReferenceResourceMock,
} = vi.hoisted(() => ({
  useBOMReferenceResourceMock: vi.fn(),
}))

vi.mock('./use-bom-reference-resource', () => ({
  useBOMReferenceResource: useBOMReferenceResourceMock,
}))

const mockedUseBOMReferenceResource = vi.mocked(useBOMReferenceResource)

describe('useBOMFormOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates enabled state to the shared BOM reference resource hook', () => {
    mockedUseBOMReferenceResource.mockReturnValue({
      status: 'ready',
      products: [{ id: 'product-1', sku: 'SKU-001', name: 'Product A' }],
      productDisplayLabelMap: new Map([['product-1', 'Product A (高刚性)']]),
      materials: [{ id: 'mat-1', code: 'MAT-001', name: 'Material A', category: 'RAW_MATERIAL', spec: '', uom: 'PCS', status: 'Active' }],
      sections: [{ value: 'PREPARE', label: '备料', code: 'PREPARE', name: '备料', active: true, sortOrder: 1, isDefault: true, legacyNames: ['备料'] }],
      productTemplates: [{ id: 'template-rim', code: 'RIM_TEMPLATE', name: '车圈规格' }],
      productTypes: [{ id: 'type-rim', code: 'RIM', name: 'Rim' }],
      productAttributeCategories: [{ id: 'category-series', key: 'techSeries', nameZh: '工艺系列', nameEn: 'Series' }],
      productAttributeOptions: [{ id: 'option-series', categoryKey: 'techSeries', value: 'high-tg', labelZh: '高刚性', labelEn: 'High TG' }],
    } as ReturnType<typeof useBOMReferenceResource>)

    expect(useBOMFormOptions({ open: true })).toEqual({
      status: 'ready',
      products: [{ id: 'product-1', sku: 'SKU-001', name: 'Product A' }],
      productDisplayLabelMap: new Map([['product-1', 'Product A (高刚性)']]),
      materials: [{ id: 'mat-1', code: 'MAT-001', name: 'Material A', category: 'RAW_MATERIAL', spec: '', uom: 'PCS', status: 'Active' }],
      sections: [{ value: 'PREPARE', label: '备料', code: 'PREPARE', name: '备料', active: true, sortOrder: 1, isDefault: true, legacyNames: ['备料'] }],
      productTemplates: [{ id: 'template-rim', code: 'RIM_TEMPLATE', name: '车圈规格' }],
      productTypes: [{ id: 'type-rim', code: 'RIM', name: 'Rim' }],
      productAttributeCategories: [{ id: 'category-series', key: 'techSeries', nameZh: '工艺系列', nameEn: 'Series' }],
      productAttributeOptions: [{ id: 'option-series', categoryKey: 'techSeries', value: 'high-tg', labelZh: '高刚性', labelEn: 'High TG' }],
    })
    expect(mockedUseBOMReferenceResource).toHaveBeenCalledWith({ enabled: true })

    useBOMFormOptions({ open: false })
    expect(mockedUseBOMReferenceResource).toHaveBeenCalledWith({ enabled: false })
  })
})
