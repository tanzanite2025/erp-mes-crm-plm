import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { RoutingService } from './routing-service'

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('RoutingService event source contracts', () => {
  it('posts a create payload without persistence fields and deserializes the response', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'source-1',
      code: 'SALES_ORDER',
      name: '销售订单',
      module: 'Trading',
      entity: 'ORDER',
      enabled: true,
      description: '销售订单事件源',
      config: {
        actions: [{ code: 'CREATED', name: '新建', kind: 'created' }],
        statuses: [{ code: 'Draft' }],
        fields: [{ key: 'orderId', label: '订单ID', path: 'orderId', type: 'string' }],
        dynamicResolvers: [],
        defaultActionUrlTemplate: '/trading/orders/[OrderId]',
      },
    })

    const payload = {
      code: 'SALES_ORDER',
      name: '销售订单',
      module: 'Trading',
      entity: 'ORDER' as const,
      enabled: true,
      description: '销售订单事件源',
      config: {
        actions: [{ code: 'CREATED', name: '新建', kind: 'created' as const }],
        statuses: [{ code: 'Draft' }],
        fields: [
          {
            key: 'orderId',
            label: '订单ID',
            path: 'orderId',
            type: 'string' as const,
            templateEnabled: false,
            dynamicResolver: false,
          },
        ],
        dynamicResolvers: [],
        defaultActionUrlTemplate: '/trading/orders/[OrderId]',
      },
    }

    await RoutingService.saveEventSource(payload)

    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    const [url, request] = apiFetchMock.mock.calls[0]
    expect(url).toBe('/system/routing/event-sources')
    expect(request.method).toBe('POST')

    const body = JSON.parse(request.body as string)
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('createdAt')
    expect(body).not.toHaveProperty('updatedAt')
    expect(body).toEqual(
      expect.objectContaining({
        code: 'SALES_ORDER',
        name: '销售订单',
        module: 'Trading',
        entity: 'ORDER',
        enabled: true,
        description: '销售订单事件源',
        config: expect.objectContaining({
          dynamicResolvers: [],
          defaultActionUrlTemplate: '/trading/orders/[OrderId]',
        }),
      })
    )
    expect(body.config.actions).toEqual([
      expect.objectContaining({
        code: 'CREATED',
        name: '新建',
        kind: 'created',
        id: expect.any(String),
        order: 0,
      }),
    ])
    expect(body.config.statuses).toEqual([
      expect.objectContaining({
        code: 'Draft',
        id: expect.any(String),
        order: 0,
      }),
    ])
    expect(body.config.fields).toEqual([
      expect.objectContaining({
        key: 'orderId',
        label: '订单ID',
        path: 'orderId',
        type: 'string',
        templateEnabled: false,
        dynamicResolver: false,
        id: expect.any(String),
        order: 0,
      }),
    ])
  })

  it('puts an update payload without leaking entity persistence fields', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'source-1',
      code: 'SALES_ORDER',
      name: '销售订单 V2',
      module: 'Trading',
      entity: 'ORDER',
      enabled: true,
      description: '销售订单事件源',
      config: {
        actions: [{ id: 'action-1', order: 0, code: 'CREATED', name: '新建', kind: 'created' }],
        statuses: [{ id: 'status-1', order: 0, code: 'Draft' }],
        fields: [{ id: 'field-1', order: 0, key: 'orderId', label: '订单ID', path: 'orderId', type: 'string' }],
        dynamicResolvers: [],
        defaultActionUrlTemplate: '/trading/orders/[OrderId]',
      },
    })

    const payload = {
      code: 'SALES_ORDER',
      name: '销售订单 V2',
      module: 'Trading',
      entity: 'ORDER' as const,
      enabled: true,
      description: '销售订单事件源',
      config: {
        actions: [{ id: 'action-1', order: 0, code: 'CREATED', name: '新建', kind: 'created' as const }],
        statuses: [{ id: 'status-1', order: 0, code: 'Draft' }],
        fields: [
          {
            id: 'field-1',
            order: 0,
            key: 'orderId',
            label: '订单ID',
            path: 'orderId',
            type: 'string' as const,
            templateEnabled: false,
            dynamicResolver: false,
          },
        ],
        dynamicResolvers: [],
        defaultActionUrlTemplate: '/trading/orders/[OrderId]',
      },
    }

    await RoutingService.updateEventSource('source-1', payload)

    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    const [url, request] = apiFetchMock.mock.calls[0]
    expect(url).toBe('/system/routing/event-sources/source-1')
    expect(request.method).toBe('PUT')

    const body = JSON.parse(request.body as string)
    expect(body).not.toHaveProperty('id')
    expect(body).not.toHaveProperty('createdAt')
    expect(body).not.toHaveProperty('updatedAt')
    expect(body).toEqual(
      expect.objectContaining({
        code: 'SALES_ORDER',
        name: '销售订单 V2',
        module: 'Trading',
        entity: 'ORDER',
        enabled: true,
        description: '销售订单事件源',
        config: expect.objectContaining({
          dynamicResolvers: [],
          defaultActionUrlTemplate: '/trading/orders/[OrderId]',
        }),
      })
    )
    expect(body.config.actions).toEqual([
      expect.objectContaining({
        id: 'action-1',
        order: 0,
        code: 'CREATED',
        name: '新建',
        kind: 'created',
      }),
    ])
    expect(body.config.statuses).toEqual([
      expect.objectContaining({
        id: 'status-1',
        order: 0,
        code: 'Draft',
      }),
    ])
    expect(body.config.fields).toEqual([
      expect.objectContaining({
        id: 'field-1',
        order: 0,
        key: 'orderId',
        label: '订单ID',
        path: 'orderId',
        type: 'string',
        templateEnabled: false,
        dynamicResolver: false,
      }),
    ])
  })
})

describe('RoutingService.getRules', () => {
  it('normalizes legacy segment ids when the server payload is missing them', async () => {
    apiFetchMock.mockResolvedValue([
      {
        id: 'rule-1',
        name: 'Sales Order Pending',
        enabled: true,
        entity: 'ORDER',
        sourceCode: 'SALES_ORDER',
        actionCode: 'STATUS_CHANGED',
        segments: [
          {
            title: 'Pending Review',
            targetStatuses: ['Pending'],
            commandIds: [],
            assigneeGroups: [],
            assigneeUsernames: [],
            resolveOnStatuses: ['Done'],
            dynamicTargetField: null,
          },
        ],
        createdAt: '2026-04-18T07:30:00.000Z',
        version: 1,
      },
    ])

    const result = await RoutingService.getRules()

    expect(apiFetchMock).toHaveBeenCalledWith('/system/routing/rules')
    expect(result).toEqual([
      expect.objectContaining({
        id: 'rule-1',
        segments: [
          expect.objectContaining({
            id: 'segment-pending-review-pending-1',
            title: 'Pending Review',
          }),
        ],
      }),
    ])
  })
})

describe('RoutingService.getExecutionLogs', () => {
  it('builds a stable query string for pagination and filters', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'log-1',
          createdAt: '2026-04-18T07:30:00.000Z',
          updatedAt: '2026-04-18T07:30:00.000Z',
          eventKey: 'event-1',
          entity: 'ORDER',
          sourceCode: 'SALES_ORDER',
          actionCode: 'STATUS_CHANGED',
          statusCode: 'Pending',
          ruleId: 'rule-1',
          ruleName: 'Sales Order Pending',
          segmentId: 'segment-1',
          segmentTitle: 'Pending Review',
          executionType: 'notify',
          executionStatus: 'success',
          commandId: 'cmd-1',
          title: 'Pending Order',
          content: 'Order SO-001 is pending',
          actionUrl: '/trading/orders/order-1',
          targets: ['alice'],
          metadata: { OrderId: 'order-1' },
          result: { mode: 'live' },
          errorMessage: '',
          triggeredAt: '2026-04-18T07:30:00.000Z',
        },
      ],
      total: 1,
      page: 2,
      pageSize: 25,
    })

    const result = await RoutingService.getExecutionLogs({
      page: 2,
      pageSize: 25,
      eventKey: 'event-1',
      entity: 'ORDER',
      sourceCode: 'SALES_ORDER',
      actionCode: 'STATUS_CHANGED',
      statusCode: 'Pending',
      ruleId: 'rule-1',
      segmentId: 'segment-1',
      executionType: 'notify',
      executionStatus: 'success',
    })

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/system/routing/execution-logs?page=2&pageSize=25&eventKey=event-1&entity=ORDER&sourceCode=SALES_ORDER&actionCode=STATUS_CHANGED&statusCode=Pending&ruleId=rule-1&segmentId=segment-1&executionType=notify&executionStatus=success'
    )
    expect(result).toEqual({
      items: [
        {
          id: 'log-1',
          createdAt: '2026-04-18T07:30:00.000Z',
          updatedAt: '2026-04-18T07:30:00.000Z',
          eventKey: 'event-1',
          entity: 'ORDER',
          sourceCode: 'SALES_ORDER',
          actionCode: 'STATUS_CHANGED',
          statusCode: 'Pending',
          ruleId: 'rule-1',
          ruleName: 'Sales Order Pending',
          segmentId: 'segment-1',
          segmentTitle: 'Pending Review',
          executionType: 'notify',
          executionStatus: 'success',
          commandId: 'cmd-1',
          title: 'Pending Order',
          content: 'Order SO-001 is pending',
          actionUrl: '/trading/orders/order-1',
          targets: ['alice'],
          metadata: { OrderId: 'order-1' },
          result: { mode: 'live' },
          errorMessage: '',
          triggeredAt: '2026-04-18T07:30:00.000Z',
        },
      ],
      total: 1,
      page: 2,
      pageSize: 25,
    })
  })

  it('omits empty query values so filters do not drift into the request', async () => {
    apiFetchMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })

    await RoutingService.getExecutionLogs({
      page: 1,
      pageSize: 20,
      eventKey: '',
      entity: 'ORDER',
      sourceCode: undefined,
      actionCode: null as unknown as string,
      statusCode: '',
      ruleId: 'rule-1',
      segmentId: '',
      executionType: 'notify',
      executionStatus: '',
    })

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/system/routing/execution-logs?page=1&pageSize=20&entity=ORDER&ruleId=rule-1&executionType=notify'
    )
  })

  it('rejects paginated hybrid arrays so execution logs stay locked to object protocol', async () => {
    const hybrid = [] as unknown as unknown[] & Record<string, unknown>
    hybrid.items = hybrid
    hybrid.total = 0
    hybrid.page = 1
    hybrid.pageSize = 20

    apiFetchMock.mockResolvedValue(hybrid)

    await expect(RoutingService.getExecutionLogs()).rejects.toThrow(
      'Invalid input: expected object, received array'
    )
  })
})

describe('RoutingService.recordExecutionLog', () => {

  it('posts a backend-aligned execution log payload and deserializes the response', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'log-1',
      createdAt: '2026-04-18T07:30:00.000Z',
      updatedAt: '2026-04-18T07:30:00.000Z',
      eventKey: 'event-1',
      entity: 'ORDER',
      sourceCode: 'SALES_ORDER',
      actionCode: 'STATUS_CHANGED',
      statusCode: 'Pending',
      ruleId: 'rule-1',
      ruleName: 'Sales Order Pending',
      segmentId: 'segment-1',
      segmentTitle: 'Pending Review',
      executionType: 'notify',
      executionStatus: 'success',
      commandId: 'cmd-1',
      title: 'Pending Order',
      content: 'Order SO-001 is pending',
      actionUrl: '/trading/orders/order-1',
      targets: ['alice', 'bob'],
      metadata: { OrderId: 'order-1', sourceCode: 'SALES_ORDER' },
      result: { mode: 'live', targetCount: 2 },
      errorMessage: '',
      triggeredAt: '2026-04-18T07:30:00.000Z',
    })

    const payload = {
      eventKey: 'event-1',
      entity: 'ORDER',
      sourceCode: 'SALES_ORDER',
      actionCode: 'STATUS_CHANGED',
      statusCode: 'Pending',
      ruleId: 'rule-1',
      ruleName: 'Sales Order Pending',
      segmentId: 'segment-1',
      segmentTitle: 'Pending Review',
      executionType: 'notify' as const,
      executionStatus: 'success' as const,
      commandId: 'cmd-1',
      title: 'Pending Order',
      content: 'Order SO-001 is pending',
      actionUrl: '/trading/orders/order-1',
      targets: ['alice', 'bob'],
      metadata: { OrderId: 'order-1', sourceCode: 'SALES_ORDER' },
      result: { mode: 'live', targetCount: 2 },
      errorMessage: '',
      triggeredAt: '2026-04-18T07:30:00.000Z',
    }

    const result = await RoutingService.recordExecutionLog(payload)

    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/system/routing/execution-logs',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
    expect(result).toEqual({
      id: 'log-1',
      createdAt: '2026-04-18T07:30:00.000Z',
      updatedAt: '2026-04-18T07:30:00.000Z',
      eventKey: 'event-1',
      entity: 'ORDER',
      sourceCode: 'SALES_ORDER',
      actionCode: 'STATUS_CHANGED',
      statusCode: 'Pending',
      ruleId: 'rule-1',
      ruleName: 'Sales Order Pending',
      segmentId: 'segment-1',
      segmentTitle: 'Pending Review',
      executionType: 'notify',
      executionStatus: 'success',
      commandId: 'cmd-1',
      title: 'Pending Order',
      content: 'Order SO-001 is pending',
      actionUrl: '/trading/orders/order-1',
      targets: ['alice', 'bob'],
      metadata: { OrderId: 'order-1', sourceCode: 'SALES_ORDER' },
      result: { mode: 'live', targetCount: 2 },
      errorMessage: '',
      triggeredAt: '2026-04-18T07:30:00.000Z',
    })
  })

  it('rejects payloads that do not satisfy the frontend contract before sending them', async () => {
    await expect(
      RoutingService.recordExecutionLog({
        sourceCode: 'SALES_ORDER',
        actionCode: 'STATUS_CHANGED',
        executionType: 'notify',
        executionStatus: 'success',
        metadata: ['not-an-object'] as unknown as Record<string, unknown>,
      })
    ).rejects.toThrow()

    expect(apiFetchMock).not.toHaveBeenCalled()
  })
})
