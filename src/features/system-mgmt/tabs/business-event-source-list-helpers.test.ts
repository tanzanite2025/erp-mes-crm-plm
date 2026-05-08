import { describe, expect, it } from 'vitest'
import { normalizeBusinessEventSource } from '../workflow-core/data/business-event-source-normalizer'
import { DEFAULT_SALES_ORDER_EVENT_SOURCE } from '../workflow-core/data/business-event-source-templates/sales-order'
import {
  createDuplicateEventSource,
  createEventSourceFromTemplate,
  createNewEventSource,
} from './business-event-source-list-helpers'

function createExistingSource() {
  return normalizeBusinessEventSource({
    ...DEFAULT_SALES_ORDER_EVENT_SOURCE,
    id: 'existing-source-id',
  })
}

describe('business-event-source-list-helpers', () => {
  it('creates a blank source without leaking template persistence fields', () => {
    const created = createNewEventSource()

    expect(created).not.toHaveProperty('id')
    expect(created.code).toMatch(/^CUSTOM_SOURCE_/)
    expect(created.name).toContain('新业务事件源')
  })

  it('creates a source from template without preserving the template id', () => {
    const created = createEventSourceFromTemplate(
      DEFAULT_SALES_ORDER_EVENT_SOURCE,
      []
    )

    expect(created).not.toHaveProperty('id')
    expect(created.code).toBe('SALES_ORDER')
    expect(created.name).toBe('销售订单')
  })

  it('creates a duplicate source with a new code and no persistence id', () => {
    const source = createExistingSource()

    const duplicated = createDuplicateEventSource(source, [source])

    expect(duplicated).not.toHaveProperty('id')
    expect(duplicated.code).toBe('SALES_ORDER_COPY')
    expect(duplicated.name).toBe('销售订单 副本')
  })
})
