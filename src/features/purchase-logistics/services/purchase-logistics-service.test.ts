import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PurchaseLogisticsService } from './purchase-logistics-service'

const { apiFetchMock, getControlledTrackingDetailMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  getControlledTrackingDetailMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

vi.mock('../../logistics/services/logistics-service', () => ({
  logisticsService: {
    getControlledTrackingDetail: getControlledTrackingDetailMock,
  },
}))

describe('PurchaseLogisticsService', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    getControlledTrackingDetailMock.mockReset()
  })

  it('normalizes string events when fetching records', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'log-1',
          orderNo: 'PO-001',
          carrier: '17TRACK',
          trackingNo: 'RR123456789CN',
          status: 'InTransit',
          lastLocation: 'Hangzhou',
          events: JSON.stringify([
            {
              id: 'evt-1',
              time: '2026-05-03T08:00:00.000Z',
              location: 'Hangzhou',
              description: 'Local timeline event',
              status: 'InTransit',
            },
          ]),
          version: 1,
          updatedAt: '2026-05-03T08:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 100,
    })

    const result = await PurchaseLogisticsService.getRecords({ page: 1, pageSize: 100 })

    expect(result.items?.[0]?.events).toEqual([
      {
        id: 'evt-1',
        time: '2026-05-03T08:00:00.000Z',
        location: 'Hangzhou',
        description: 'Local timeline event',
        status: 'InTransit',
      },
    ])
  })

  it('maps controlled tracking detail to purchase timeline events', async () => {
    getControlledTrackingDetailMock.mockResolvedValue({
      order: {
        id: 1,
        createdAt: '2026-05-03T08:00:00.000Z',
        updatedAt: '2026-05-03T08:01:00.000Z',
        bizOrderNo: 'PO-001',
        bizType: 'Receipt',
        carrierCode: '17TRACK',
        carrierName: '17TRACK',
        trackingNo: 'RR123456789CN',
        status: 'InTransit',
        lastLocation: 'Hangzhou',
        lastEvent: 'Trusted update',
        version: 1,
      },
      events: [
        {
          id: 'trusted-1',
          time: '2026-05-03T08:01:00.000Z',
          location: 'Hangzhou',
          description: 'Trusted update',
          status: 'InTransit',
        },
      ],
      refresh: {
        status: 'refreshed',
        providerCode: '17TRACK',
        message: 'trusted tracking query completed',
        action: '同步完成',
        insertedTraces: 1,
        checkedAt: '2026-05-03T08:01:00.000Z',
      },
    })

    const result = await PurchaseLogisticsService.getControlledTrackingDetail('RR123456789CN', {
      refresh: true,
    })

    expect(getControlledTrackingDetailMock).toHaveBeenCalledWith('RR123456789CN', { refresh: true })
    expect(result).toEqual({
      order: expect.objectContaining({ trackingNo: 'RR123456789CN' }),
      events: [
        {
          id: 'trusted-1',
          time: '2026-05-03T08:01:00.000Z',
          location: 'Hangzhou',
          description: 'Trusted update',
          status: 'InTransit',
        },
      ],
      refresh: expect.objectContaining({ status: 'refreshed' }),
    })
  })

  it('returns null when no controlled tracking detail exists', async () => {
    getControlledTrackingDetailMock.mockResolvedValue(null)

    await expect(PurchaseLogisticsService.getControlledTrackingDetail('RR123456789CN')).resolves.toBeNull()
  })
})
