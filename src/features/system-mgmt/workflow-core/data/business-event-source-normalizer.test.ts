import { describe, expect, it } from 'vitest'
import { DEFAULT_SALES_ORDER_EVENT_SOURCE } from './business-event-source-templates/sales-order'
import {
  canonicalizeBusinessStatusCode,
  deserializeBusinessEventSource,
  deserializeBusinessEventSources,
  deserializeBusinessEventSourceTemplate,
  materializeBusinessEventSourceTemplate,
  normalizeBusinessStatusCodeInput,
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

  it('accepts additional business status codes during list deserialization', () => {
    const entities = deserializeBusinessEventSources([
      {
        ...DEFAULT_SALES_ORDER_EVENT_SOURCE,
        id: 'entity-1',
        config: {
          ...DEFAULT_SALES_ORDER_EVENT_SOURCE.config,
          statuses: [
            ...DEFAULT_SALES_ORDER_EVENT_SOURCE.config.statuses,
            { code: 'Scheduling' },
          ],
        },
      },
    ])

    expect(entities).toHaveLength(1)
    expect(entities[0]?.config.statuses[entities[0].config.statuses.length - 1]?.code).toBe('Scheduling')
  })

  it('does not reject the whole event source list when an unknown status code appears', () => {
    const entities = deserializeBusinessEventSources([
      {
        ...DEFAULT_SALES_ORDER_EVENT_SOURCE,
        id: 'entity-unknown-phase',
        config: {
          ...DEFAULT_SALES_ORDER_EVENT_SOURCE.config,
          statuses: [
            { code: 'Reviewing' },
          ],
        },
      },
    ])

    expect(entities).toHaveLength(1)
    expect(entities[0]?.config.statuses[0]?.code).toBe('Reviewing')
  })

  it('normalizes raw status input separators before persistence', () => {
    expect(normalizeBusinessStatusCodeInput(' in progress ')).toBe('in_progress')
    expect(normalizeBusinessStatusCodeInput('PENDING-APPROVAL')).toBe('PENDING_APPROVAL')
  })

  it('canonicalizes known catalog statuses back to source-aware codes', () => {
    expect(canonicalizeBusinessStatusCode('SALES_ORDER', 'draft')).toBe('Draft')
    expect(canonicalizeBusinessStatusCode('QUALITY_STANDARD', 'pending approval')).toBe(
      'PENDING_APPROVAL'
    )
  })

  it('serializes custom statuses into canonical machine codes', () => {
    const payload = serializeBusinessEventSourceUpdate({
      ...DEFAULT_SALES_ORDER_EVENT_SOURCE,
      config: {
        ...DEFAULT_SALES_ORDER_EVENT_SOURCE.config,
        statuses: [{ code: 'quality hold' }],
      },
    })

    expect(payload.config.statuses[0]?.code).toBe('QUALITY_HOLD')
  })
})
