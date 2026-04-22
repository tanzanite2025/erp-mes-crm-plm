import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { getRoutingQueryErrorState } from './routing-query-error-state.helpers'

describe('routing-query-error-state', () => {
  it('maps zod protocol errors to a readable protocol state', () => {
    const parsed = z
      .object({
        items: z.array(z.string()),
        total: z.number(),
        page: z.number(),
        pageSize: z.number(),
      })
      .safeParse([])

    expect(parsed.success).toBe(false)

    const state = getRoutingQueryErrorState(parsed.error, {
      resourceLabel: '执行日志',
      endpoint: '/system/routing/execution-logs',
      protocolShape: '`{ items, total, page, pageSize }`',
    })

    expect(state.tone).toBe('protocol')
    expect(state.title).toBe('执行日志数据格式异常')
    expect(state.hint).toContain('/system/routing/execution-logs')
    expect(state.detail?.toLowerCase()).toContain('expected object')
  })

  it('maps network errors to a readable retry state', () => {
    const state = getRoutingQueryErrorState(
      new Error('[NETWORK_ERROR] request failed'),
      {
        resourceLabel: '业务事件源',
        endpoint: '/system/routing/event-sources',
      }
    )

    expect(state.tone).toBe('network')
    expect(state.title).toBe('业务事件源暂时无法连接')
    expect(state.hint).toContain('重新加载')
  })
})
