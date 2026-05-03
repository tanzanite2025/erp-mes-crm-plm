import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClientError } from '@/lib/api-error'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { logisticsService } from './logistics-service'

describe('logistics-service', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('returns null when the trusted tracking detail endpoint responds with 404', async () => {
    apiFetchMock.mockRejectedValue(
      createApiClientError({
        kind: 'http',
        message: 'not found',
        endpoint: '/logistics-push/tracking/MISSING-1',
        status: 404,
      })
    )

    await expect(logisticsService.getControlledTrackingDetail('MISSING-1')).resolves.toBeNull()
    expect(apiFetchMock).toHaveBeenCalledWith('/logistics-push/tracking/MISSING-1', {
      suppressErrorStatuses: [404],
    })
  })

  it('appends refresh=1 when triggering trusted tracking refresh', async () => {
    apiFetchMock.mockResolvedValue({
      order: {
        id: 1,
        createdAt: '2026-05-03T08:00:00.000Z',
        updatedAt: '2026-05-03T08:02:00.000Z',
        bizOrderNo: 'SO-001',
        bizType: 'Sales',
        carrierCode: '17TRACK',
        carrierName: '17TRACK',
        trackingNo: 'RR123456789CN',
        status: 'InTransit',
        lastLocation: 'Hangzhou',
        lastEvent: 'Package in transit',
        version: 2,
      },
      traces: [
        {
          time: '2026-05-03T08:01:00.000Z',
          context: 'Package in transit',
          location: 'Hangzhou',
          hashKey: 'trace-1',
        },
      ],
      refresh: {
        status: 'refreshed',
        message: 'trusted tracking query completed',
        action: '系统已通过受控 17TRACK 网关完成实时查询，并同步写回本地轨迹数据。',
        providerCode: '17TRACK',
        insertedTraces: 1,
        checkedAt: '2026-05-03T08:02:00.000Z',
      },
    })

    const result = await logisticsService.getControlledTrackingDetail('RR123456789CN', { refresh: true })

    expect(apiFetchMock).toHaveBeenCalledWith('/logistics-push/tracking/RR123456789CN?refresh=1', {
      suppressErrorStatuses: [404],
    })
    expect(result?.order.trackingNo).toBe('RR123456789CN')
    expect(result?.events[0]?.status).toBe('InTransit')
    expect(result?.refresh?.status).toBe('refreshed')
  })
})
