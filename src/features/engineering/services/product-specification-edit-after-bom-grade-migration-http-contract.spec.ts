import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type ProductApiDTO } from '../contracts/product-api-dto'
import { type Product } from '../data/schema'
import { ProductCoreService } from './product-core-service'
import { ProductMaintenanceService } from './product-maintenance-service'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({ accessToken: 'product-specification-regression-token' }),
  },
}))

const originalAttributeValues = [
  { categoryKey: 'versionLevel', optionValue: 'std', sortOrder: 1, version: 1 },
  {
    categoryKey: 'techSeries',
    optionValue: 'normal',
    sortOrder: 2,
    version: 1,
  },
  { categoryKey: 'tireType', optionValue: 'hooked', sortOrder: 3, version: 1 },
  { categoryKey: 'brakeType', optionValue: 'disc', sortOrder: 4, version: 1 },
]
const historicalProduct: ProductApiDTO = {
  id: 'product-r50',
  sku: 'R50-01',
  name: 'R50 (碟刹)',
  modelCode: '01',
  typeId: 'type-r50',
  depth: 50,
  attributeValues: originalAttributeValues,
  restrictions: [],
  attachments: [],
  createdAt: '2026-05-18T00:00:00Z',
  status: 'Active',
  version: 3,
}
const fetchProductSpecificationRequest = vi.fn<typeof fetch>()

describe('product specification editing after product grade ownership moved to BOM', () => {
  beforeEach(() => {
    fetchProductSpecificationRequest.mockReset()
    vi.stubGlobal('fetch', fetchProductSpecificationRequest)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('loads the three product attributes without the hidden historical BOM grade', async () => {
    fetchProductSpecificationRequest.mockResolvedValueOnce(
      Response.json(historicalProduct)
    )
    const product = await ProductCoreService.getProductById(
      historicalProduct.id
    )
    expect(product.attributeValues).toEqual(originalAttributeValues.slice(1))
    expect(originalAttributeValues).toHaveLength(4)
  })

  it('edits dimensions from an old cached product without resubmitting the retired grade', async () => {
    const cachedProduct = historicalProduct as Product
    fetchProductSpecificationRequest.mockResolvedValueOnce(
      Response.json({ ...historicalProduct, depth: 51, version: 4 })
    )
    const saved = await ProductMaintenanceService.patchProduct(cachedProduct, {
      ...cachedProduct,
      depth: 51,
    })
    const [path, request] = fetchProductSpecificationRequest.mock.calls[0]
    expect(String(path)).toContain('/engineering/products/product-r50')
    expect(request?.method).toBe('PATCH')
    expect(JSON.parse(String(request?.body))).toMatchObject({
      op: 'PATCH',
      metadata: { id: 'product-r50', version: 3 },
      delta: { depth: { o: 50, n: 51 } },
    })
    expect(JSON.parse(String(request?.body)).delta).not.toHaveProperty(
      'attributeValues'
    )
    expect(saved.depth).toBe(51)
    expect(saved.attributeValues).toHaveLength(3)
  })

  it('sends real attribute changes and retains unknown categories for server validation', async () => {
    const cachedProduct = historicalProduct as Product
    const updatedAttributes = [
      ...originalAttributeValues.map((attribute) =>
        attribute.categoryKey === 'techSeries'
          ? { ...attribute, optionValue: 'high-tg' }
          : attribute
      ),
      {
        categoryKey: 'missing-category',
        optionValue: 'x',
        sortOrder: 5,
        version: 1,
      },
    ]
    fetchProductSpecificationRequest.mockResolvedValueOnce(
      Response.json({ error: '[VALIDATION] 分类不存在' }, { status: 400 })
    )
    await expect(
      ProductMaintenanceService.patchProduct(cachedProduct, {
        ...cachedProduct,
        attributeValues: updatedAttributes,
      })
    ).rejects.toThrow('分类不存在')
    const payload = JSON.parse(
      String(fetchProductSpecificationRequest.mock.calls[0][1]?.body)
    )
    expect(payload.delta.attributeValues.n).toEqual(updatedAttributes.slice(1))
    expect(payload.delta.attributeValues.o).toEqual(
      originalAttributeValues.slice(1)
    )
  })

  it('omits the grade when creating from a historical draft, including legacy key casing', async () => {
    fetchProductSpecificationRequest.mockResolvedValueOnce(
      Response.json({ ...historicalProduct, id: 'created-product', version: 1 })
    )
    await ProductMaintenanceService.createProduct({
      ...(historicalProduct as Product),
      attributeValues: [
        ...originalAttributeValues.slice(1),
        {
          categoryKey: ' VERSIONLEVEL ',
          optionValue: 'std',
          sortOrder: 4,
          version: 1,
        },
      ],
    })
    const payload = JSON.parse(
      String(fetchProductSpecificationRequest.mock.calls[0][1]?.body)
    )
    expect(payload.attributeValues).toEqual(originalAttributeValues.slice(1))
  })
})
