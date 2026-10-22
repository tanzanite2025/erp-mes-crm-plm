import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { bomService } from './bom-service'

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({ accessToken: 'bom-association-read-contract-token' }),
  },
}))

const associationRequest = vi.fn<typeof fetch>()
beforeEach(() => {
  associationRequest.mockReset()
  vi.stubGlobal('fetch', associationRequest)
})
afterEach(() => vi.unstubAllGlobals())

describe('BOM association options use the existing complete read endpoint', () => {
  it('requests every association for the current product without the default page limit', async () => {
    const records = Array.from({ length: 63 }, (_, index) => ({
      id: `bom-${index + 1}`,
      bomNo: `BOM-${index + 1}`,
      productId: 'current-product',
    }))
    associationRequest.mockResolvedValueOnce(Response.json(records))
    const boms = await bomService.getBOMAssociationOptions({
      productId: 'current-product',
    })
    const [path] = associationRequest.mock.calls[0]
    const url = new URL(String(path), 'http://localhost')
    expect(url.pathname).toContain('/engineering/bom')
    expect(url.searchParams.get('options')).toBe('true')
    expect(url.searchParams.get('productId')).toBe('current-product')
    expect(boms).toHaveLength(63)
    expect(boms[62].id).toBe('bom-63')
  })

  it('can load the complete association metadata for the product list', async () => {
    associationRequest.mockResolvedValueOnce(Response.json([]))
    await bomService.getBOMAssociationOptions()
    const [path] = associationRequest.mock.calls[0]
    const url = new URL(String(path), 'http://localhost')
    expect(url.searchParams.get('options')).toBe('true')
    expect(url.searchParams.has('productId')).toBe(false)
  })
})
