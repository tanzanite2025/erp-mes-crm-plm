import { describe, expect, it } from 'vitest'
import { type BusinessEventSource } from './business-event-source-types'
import {
  getStandardCommandDisplayTitle,
  getStandardCommandContextCategory,
  getStandardCommandContextGuard,
} from './schema'

describe('standard-command-scope', () => {
  it('treats global templates as a direct match', () => {
    const command = {
      sourceCode: '',
      actionCode: '',
      statusCodes: [],
    }
    const context = {
      sourceCode: 'SALES_ORDER',
      actionCode: 'STATUS_CHANGED',
      statusCode: 'Pending',
    }

    expect(getStandardCommandContextCategory(command, context)).toBe('global')
    expect(getStandardCommandContextGuard(command, context)).toEqual({
      tone: 'match',
      reasons: [],
    })
  })

  it('treats partially scoped but compatible templates as warnings', () => {
    const command = {
      sourceCode: 'SALES_ORDER',
      actionCode: 'STATUS_CHANGED',
      statusCodes: [],
    }
    const context = {
      sourceCode: 'SALES_ORDER',
      actionCode: 'STATUS_CHANGED',
      statusCode: 'Pending',
    }

    expect(getStandardCommandContextCategory(command, context)).toBe('recommended')
    expect(getStandardCommandContextGuard(command, context)).toEqual({
      tone: 'warning',
      reasons: ['模板范围与当前状态兼容，但仍覆盖更宽的业务上下文'],
    })
  })

  it('treats explicitly conflicting templates as blocking', () => {
    const command = {
      sourceCode: 'PURCHASE_ORDER',
      actionCode: 'STATUS_CHANGED',
      statusCodes: ['Done'],
    }
    const context = {
      sourceCode: 'SALES_ORDER',
      actionCode: 'STATUS_CHANGED',
      statusCode: 'Pending',
    }

    expect(getStandardCommandContextCategory(command, context)).toBe('other')
    expect(getStandardCommandContextGuard(command, context)).toEqual({
      tone: 'blocking',
      reasons: ['模板业务源限定为 PURCHASE_ORDER', '模板状态限定为 Done'],
    })
  })

  it('builds display titles from authoritative source, action, and status labels', () => {
    const command = {
      sourceCode: 'SALES_ORDER',
      actionCode: 'STATUS_CHANGED',
      statusCodes: ['Pending'],
    }
    const sources: Array<Pick<BusinessEventSource, 'code' | 'name' | 'config'>> = [
      {
        code: 'SALES_ORDER',
        name: '销售订单',
        config: {
          actions: [
            {
              id: 'action-1',
              code: 'STATUS_CHANGED',
              name: '状态变更',
              kind: 'status',
              order: 0,
            },
          ],
          statuses: [],
          fields: [],
          dynamicResolvers: [],
        },
      },
    ]

    expect(getStandardCommandDisplayTitle(command, sources)).toBe(
      '销售订单 · 状态变更 · 待处理'
    )
  })
})
