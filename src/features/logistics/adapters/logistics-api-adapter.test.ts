import { describe, expect, it } from 'vitest'
import { toControlledTrackingDetailContract, toLogisticsListPageContract } from './logistics-api-adapter'

describe('logistics-api-adapter', () => {
  it('does not synthesize missing list items into an empty logistics page', () => {
    expect(() =>
      toLogisticsListPageContract({
        total: 0,
        page: 1,
        pageSize: 50,
      } as never)
    ).toThrow()
  })

  it('maps controlled tracking detail traces and refresh payloads into the existing logistics timeline contract', () => {
    const result = toControlledTrackingDetailContract({
      order: {
        id: 1,
        createdAt: '2026-05-03T08:00:00.000Z',
        updatedAt: '2026-05-03T08:02:00.000Z',
        bizOrderNo: 'SO-001',
        bizType: 'Sales',
        carrierCode: '17TRACK',
        carrierName: '17TRACK',
        trackingNo: 'RR123456789CN',
        status: 'Signed',
        lastLocation: 'Shanghai',
        lastEvent: 'Package signed',
        version: 3,
      },
      traces: [
        {
          id: 10,
          time: '2026-05-03T08:01:00.000Z',
          context: '包裹已签收',
          location: 'Shanghai',
          hashKey: 'hash-1',
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

    expect(result.order.trackingNo).toBe('RR123456789CN')
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toEqual({
      id: 'hash-1',
      time: '2026-05-03T08:01:00.000Z',
      location: 'Shanghai',
      description: '包裹已签收',
      status: 'Delivered',
    })
    expect(result.refresh?.providerCode).toBe('17TRACK')
    expect(result.refresh?.insertedTraces).toBe(1)
  })
})
