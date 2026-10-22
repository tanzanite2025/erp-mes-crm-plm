import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProductDraft } from '../utils/default-builders'
import { ProductMaintenanceService } from './product-maintenance-service'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({ accessToken: 'product-write-contract-token' }),
  },
}))

const productRecord = createProductDraft({
  id: 'saved-product',
  name: '产品规格',
  sku: 'MODEL-01',
  typeId: 'base-model',
  version: 3,
})
const productRequest = vi.fn<typeof fetch>()

beforeEach(() => {
  productRequest.mockReset()
  vi.stubGlobal('fetch', productRequest)
})
afterEach(() => vi.unstubAllGlobals())

describe('product saves exclude the retired product-side BOM selection', () => {
  it('creates from an older draft without submitting an unsupported BOM relationship', async () => {
    productRequest.mockResolvedValueOnce(Response.json(productRecord))
    const oldDraft = { ...productRecord, id: '', bomId: 'another-products-bom' }
    const saved = await ProductMaintenanceService.createProduct(oldDraft)
    const [path, request] = productRequest.mock.calls[0]
    expect(String(path)).toContain('/engineering/products')
    expect(request?.method).toBe('POST')
    expect(JSON.parse(String(request?.body))).not.toHaveProperty('bomId')
    expect(saved.id).toBe(productRecord.id)
    expect(saved).not.toHaveProperty('bomId')
    expect(productRequest).toHaveBeenCalledOnce()
  })

  it('edits real product fields without generating a bomId patch from cached selections', async () => {
    productRequest.mockResolvedValueOnce(
      Response.json({ ...productRecord, depth: 51, version: 4 })
    )
    const oldCachedProduct = { ...productRecord, bomId: 'old-bom' }
    const editedProduct = {
      ...oldCachedProduct,
      depth: 51,
      bomId: 'another-products-bom',
    }
    const saved = await ProductMaintenanceService.patchProduct(
      oldCachedProduct,
      editedProduct
    )
    const [, request] = productRequest.mock.calls[0]
    expect(request?.method).toBe('PATCH')
    const payload = JSON.parse(String(request?.body))
    expect(payload.delta).toHaveProperty('depth.n', 51)
    expect(payload.delta).not.toHaveProperty('bomId')
    expect(payload.metadata).toMatchObject({ id: productRecord.id, version: 3 })
    expect(saved.depth).toBe(51)
    expect(productRequest).toHaveBeenCalledOnce()
  })

  it('does not write any product or BOM when only an old unsupported selection differs', async () => {
    const oldCachedProduct = { ...productRecord, bomId: 'old-bom' }
    const editedProduct = { ...oldCachedProduct, bomId: 'another-products-bom' }
    await ProductMaintenanceService.patchProduct(
      oldCachedProduct,
      editedProduct
    )
    expect(productRequest).not.toHaveBeenCalled()
  })
})
