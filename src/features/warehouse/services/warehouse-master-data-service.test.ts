import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { WarehouseMasterDataService } from './warehouse-master-data-service'

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('WarehouseMasterDataService', () => {
  it('searches selectable warehouse master data through the scoped endpoint', async () => {
    apiFetchMock.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'Finished Rim',
        code: 'PROD-001',
        spec: 'Road rim',
        uom: 'PCS',
        category: 'FINISHED',
        sourceModule: 'PRODUCT',
        stock: 3,
      },
    ])

    const result = await WarehouseMasterDataService.searchSelectableItems({
      query: ' rim ',
      scope: 'SHIPMENT',
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/warehouse/master-data/search?scope=SHIPMENT&q=rim')
    expect(result).toEqual([
      {
        id: 'prod-1',
        name: 'Finished Rim',
        code: 'PROD-001',
        spec: 'Road rim',
        uom: 'PCS',
        category: 'FINISHED',
        sourceModule: 'PRODUCT',
        stock: 3,
      },
    ])
  })

  it('supports full master data loading without a query parameter', async () => {
    apiFetchMock.mockResolvedValue([])

    await WarehouseMasterDataService.searchSelectableItems({
      query: '',
      scope: 'ALL',
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/warehouse/master-data/search?scope=ALL')
  })
})
