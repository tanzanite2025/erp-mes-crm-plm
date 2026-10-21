import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type ProductTemplateAttributeLevelOneCategory,
  type ProductTemplateAttributeLevelTwoOption,
} from '../data/schema'
import { ProductAttributeCategoryService } from './product-attribute-category-service'
import { ProductAttributeOptionService } from './product-attribute-option-service'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({ accessToken: 'catalog-contract-test-token' }),
  },
}))

const existingCategory: ProductTemplateAttributeLevelOneCategory = {
  id: 'existing-category',
  key: 'techSeries',
  nameZh: '工艺系列',
  nameEn: 'Technical Series',
  description: '旧说明',
  active: true,
  sortOrder: 10,
  version: 3,
}
const existingOption: ProductTemplateAttributeLevelTwoOption = {
  id: 'existing-option',
  categoryKey: 'techSeries',
  value: 'Legacy_Value',
  labelZh: '旧名称',
  labelEn: 'Old label',
  description: '旧说明',
  active: true,
  sortOrder: 10,
  version: 2,
  revisionNo: 'R1',
  changeType: 'MANUAL',
  isDefaultSite: true,
  effectiveFrom: '2026-10-21T00:00:00Z',
  createdAt: '2026-10-01T00:00:00Z',
}
const fetchProductAttributeCatalogRequest = vi.fn<typeof fetch>()

describe('product attribute catalog save HTTP contract', () => {
  beforeEach(() => {
    fetchProductAttributeCatalogRequest.mockReset()
    vi.stubGlobal('fetch', fetchProductAttributeCatalogRequest)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('sends only changed fields, explicit clears and the original edit version through the real API client', async () => {
    const savedOption = {
      ...existingOption,
      labelZh: '新名称',
      labelEn: '',
      description: '',
      active: false,
      effectiveFrom: null,
      version: 3,
    }
    fetchProductAttributeCatalogRequest.mockResolvedValueOnce(
      Response.json(savedOption)
    )
    await expect(
      ProductAttributeOptionService.saveProductAttributeOption(
        {
          ...existingOption,
          labelZh: ' 新名称 ',
          labelEn: '  ',
          description: '',
          active: false,
          effectiveFrom: null,
        },
        existingOption
      )
    ).resolves.toEqual(savedOption)
    const [url, request] = fetchProductAttributeCatalogRequest.mock.calls[0]
    expect(String(url)).toContain(
      '/api/v1/engineering/product-attribute-options'
    )
    expect(request?.method).toBe('POST')
    expect(JSON.parse(String(request?.body))).toEqual({
      op: 'PATCH',
      delta: {
        labelZh: { o: '旧名称', n: '新名称' },
        labelEn: { o: 'Old label', n: '' },
        description: { o: '旧说明', n: '' },
        active: { o: true, n: false },
        effectiveFrom: { o: '2026-10-21T00:00:00Z', n: null },
      },
      metadata: {
        id: 'existing-option',
        version: 2,
        intent: 'PRODUCT_ATTRIBUTE_OPTION_UPSERT',
      },
    })
  })

  it('keeps legacy category keys out of a name-only edit and preserves category clears', async () => {
    fetchProductAttributeCatalogRequest.mockResolvedValueOnce(
      Response.json({ ...existingCategory, version: 4 })
    )
    await ProductAttributeCategoryService.saveProductAttributeCategory(
      { ...existingCategory, nameEn: '', description: ' ' },
      existingCategory
    )
    expect(
      JSON.parse(
        String(fetchProductAttributeCatalogRequest.mock.calls[0][1]?.body)
      )
    ).toEqual({
      op: 'PATCH',
      delta: {
        nameEn: { o: 'Technical Series', n: '' },
        description: { o: '旧说明', n: '' },
      },
      metadata: {
        id: existingCategory.id,
        version: 3,
        intent: 'PRODUCT_ATTRIBUTE_CATEGORY_UPSERT',
      },
    })
  })

  it('creates an inactive option with its stable machine value', async () => {
    const draft = {
      categoryKey: 'techSeries',
      value: 'option-123',
      labelZh: '停用项',
      labelEn: '',
      active: false,
      sortOrder: 0,
    }
    fetchProductAttributeCatalogRequest.mockResolvedValueOnce(
      Response.json({ ...draft, id: 'saved-option', version: 1 })
    )
    await ProductAttributeOptionService.saveProductAttributeOption(draft)
    expect(
      JSON.parse(
        String(fetchProductAttributeCatalogRequest.mock.calls[0][1]?.body)
      )
    ).toMatchObject({
      categoryKey: 'techSeries',
      value: 'option-123',
      labelZh: '停用项',
      active: false,
    })
  })

  it('rejects edits without a baseline and avoids submitting unchanged records', async () => {
    await expect(
      ProductAttributeOptionService.saveProductAttributeOption(existingOption)
    ).rejects.toThrow('原始数据或有效版本')
    await expect(
      ProductAttributeCategoryService.saveProductAttributeCategory(
        existingCategory
      )
    ).rejects.toThrow('原始数据或有效版本')
    await expect(
      ProductAttributeOptionService.saveProductAttributeOption(
        existingOption,
        existingOption
      )
    ).resolves.toBe(existingOption)
    expect(fetchProductAttributeCatalogRequest).not.toHaveBeenCalled()
  })

  it('propagates a server version conflict so the editor retains its draft', async () => {
    fetchProductAttributeCatalogRequest.mockResolvedValueOnce(
      Response.json(
        { error: '[CONFLICT] 产品属性分类项已被其他操作修改' },
        { status: 409 }
      )
    )
    await expect(
      ProductAttributeOptionService.saveProductAttributeOption(
        { ...existingOption, labelZh: '冲突名称' },
        existingOption
      )
    ).rejects.toMatchObject({ status: 409, isConflict: true })
  })
})
