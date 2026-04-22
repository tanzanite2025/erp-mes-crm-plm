import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { WarehouseCategoryCoreService } from './warehouse-category-core-service'

const category = {
  id: 'category-1',
  version: 1,
  name: 'Main warehouse',
  code: 'WH_A',
  description: '',
  isSystem: false,
  active: true,
  sortOrder: 1,
  allowInbound: true,
  allowShipment: true,
  allowStocktake: true,
  allowPurchaseReceipt: true,
  defaultForProductInbound: true,
  defaultForMaterialInbound: false,
  defaultForPurchaseReceipt: false,
}

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('WarehouseCategoryCoreService', () => {
  it('loads warehouse categories from the locked paginated object protocol', async () => {
    apiFetchMock.mockResolvedValue({
      items: [category],
      total: 1,
      page: 1,
      pageSize: 50,
    })

    const result = await WarehouseCategoryCoreService.getCategoryList()

    expect(apiFetchMock).toHaveBeenCalledWith('/warehouse/categories')
    expect(result).toHaveLength(1)
    expect(result[0]?.code).toBe('WH_A')
  })

  it('rejects category list payloads that omit items instead of treating them as empty lists', async () => {
    apiFetchMock.mockResolvedValue({
      total: 0,
      page: 1,
      pageSize: 50,
    })

    await expect(WarehouseCategoryCoreService.getCategoryList()).rejects.toThrow()
  })
})
