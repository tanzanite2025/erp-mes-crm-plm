import { describe, expect, it } from 'vitest'
import { DEFAULT_SALES_ORDER_EVENT_SOURCE } from './business-event-source-templates/sales-order'
import {
  deserializeBusinessEventSource,
  deserializeBusinessEventSourceTemplate,
  materializeBusinessEventSourceTemplate,
  serializeBusinessEventSourceCreate,
  serializeBusinessEventSourceUpdate,
} from './business-event-source-normalizer'

describe('business-event-source-normalizer contracts', () => {
  it('keeps template shape free of persistence fields and normalizes config ids', () => {
    const template = deserializeBusinessEventSourceTemplate({
      ...DEFAULT_SALES_ORDER_EVENT_SOURCE,
    })

    expect(template).not.toHaveProperty('id')
    expect(template.config.actions.every((item) => Boolean(item.id))).toBe(true)
    expect(template.config.statuses.every((item) => Boolean(item.id))).toBe(true)
    expect(template.config.fields.every((item) => Boolean(item.id))).toBe(true)
    expect(
      template.config.dynamicResolvers.every((item) => Boolean(item.id))
    ).toBe(true)
  })

  it('serializes create payload without leaking persistence fields', () => {
    const payload = serializeBusinessEventSourceCreate({
      ...(DEFAULT_SALES_ORDER_EVENT_SOURCE as object),
      id: 'should-not-leak',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    } as never)

    expect(payload).not.toHaveProperty('id')
    expect(payload).not.toHaveProperty('createdAt')
    expect(payload).not.toHaveProperty('updatedAt')
    expect(payload.code).toBe('SALES_ORDER')
  })

  it('serializes update payload without persistence-only fields', () => {
    const payload = serializeBusinessEventSourceUpdate({
      ...(DEFAULT_SALES_ORDER_EVENT_SOURCE as object),
      id: 'should-not-leak',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      name: '销售订单 V2',
    } as never)

    expect(payload).not.toHaveProperty('id')
    expect(payload).not.toHaveProperty('createdAt')
    expect(payload).not.toHaveProperty('updatedAt')
    expect(payload.name).toBe('销售订单 V2')
  })

  it('materializes a template into an entity only when explicitly requested', () => {
    const entity = materializeBusinessEventSourceTemplate(
      DEFAULT_SALES_ORDER_EVENT_SOURCE
    )

    expect(entity.id).toBe('template-sales_order')
    expect(entity.code).toBe('SALES_ORDER')
  })

  it('requires persistence identity when deserializing an entity', () => {
    expect(() =>
      deserializeBusinessEventSource(DEFAULT_SALES_ORDER_EVENT_SOURCE)
    ).toThrow()

    const entity = deserializeBusinessEventSource({
      ...DEFAULT_SALES_ORDER_EVENT_SOURCE,
      id: 'entity-1',
    })

    expect(entity.id).toBe('entity-1')
    expect(entity.code).toBe('SALES_ORDER')
  })
})
