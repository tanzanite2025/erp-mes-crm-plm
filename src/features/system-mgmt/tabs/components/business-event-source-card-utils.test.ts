import { describe, expect, it } from 'vitest'
import { normalizeBusinessEventSource } from '../../workflow-core/data/business-event-source-normalizer'
import { DEFAULT_SALES_ORDER_EVENT_SOURCE } from '../../workflow-core/data/business-event-source-templates/sales-order'
import {
  validateBusinessEventSource,
  validateBusinessEventSourceSection,
} from './business-event-source-card-utils'

function createSource() {
  return normalizeBusinessEventSource({
    ...DEFAULT_SALES_ORDER_EVENT_SOURCE,
    id: 'source-1',
  })
}

describe('business-event-source-card-utils status governance', () => {
  it('rejects status codes that collide after canonicalization', () => {
    const source = createSource()
    source.config.statuses = [
      { ...source.config.statuses[0]!, code: 'In Progress' },
      { ...source.config.statuses[1]!, code: 'IN_PROGRESS' },
    ]

    expect(validateBusinessEventSourceSection(source, 'statuses')).toContain(
      '状态编码规范化后重复：InProgress'
    )
  })

  it('accepts canonicalized custom status codes that remain machine-safe', () => {
    const source = createSource()
    source.config.statuses = [
      { ...source.config.statuses[0]!, code: 'quality hold' },
    ]

    expect(validateBusinessEventSource(source)).not.toContain(
      '第 1 个状态编码无法归一为有效机器码'
    )
    expect(validateBusinessEventSource(source)).not.toContain(
      '第 1 个状态编码规范化后无效：QUALITY_HOLD'
    )
  })
})
