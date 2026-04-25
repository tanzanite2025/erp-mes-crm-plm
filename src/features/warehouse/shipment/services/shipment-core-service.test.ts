import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { ShipmentCoreService } from './shipment-core-service'

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('ShipmentCoreService', () => {
  it('loads shipment history from the locked paginated object protocol', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'shipment-1',
          materialId: 'material-1',
          materialName: 'Finished Product',
          materialCode: 'FG-001',
          salesOrderId: 'so-1',
          salesOrderLineId: 1,
          quantity: 2,
          sourceCategory: 'WH_A',
          batchNo: 'B-SH-001',
          orderNo: 'SO-001',
          status: 'COMMITTED',
          cogs: 20,
          shipmentDate: '2026-04-18T00:00:00.000Z',
          operator: 'shipper',
          remarks: '',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    })

    const result = await ShipmentCoreService.getShipmentHistory()

    expect(apiFetchMock).toHaveBeenCalledWith('/inventory/shipment?page=1&pageSize=50')
    expect(result).toHaveLength(1)
    expect(result[0]?.orderNo).toBe('SO-001')
  })

  it('rejects shipment history payloads that omit items instead of treating them as empty lists', async () => {
    apiFetchMock.mockResolvedValue({
      total: 0,
      page: 1,
      pageSize: 50,
    })

    await expect(ShipmentCoreService.getShipmentHistory()).rejects.toThrow(
      '[INVALID_RESPONSE] ShipmentCoreService.getShipmentHistory expected "items" to be an array.'
    )
  })
})
