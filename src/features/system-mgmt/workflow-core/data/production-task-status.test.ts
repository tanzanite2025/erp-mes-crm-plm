import { describe, expect, it } from 'vitest'
import { BUSINESS_EVENT_SOURCE_TEMPLATES } from './business-event-source-templates'
import {
  normalizeProductionTaskStatus,
  productionTaskStatuses,
} from './production-task-status'

describe('production-task-status', () => {
  it('locks the unique production task status dictionary', () => {
    expect(productionTaskStatuses).toEqual(['PENDING', 'RUNNING', 'HOLD', 'DONE'])
  })

  it('rejects non-canonical production task statuses', () => {
    expect(() => normalizeProductionTaskStatus('Scheduled')).toThrow(
      'Invalid production task status: Scheduled'
    )
    expect(() => normalizeProductionTaskStatus('Completed')).toThrow(
      'Invalid production task status: Completed'
    )
  })

  it('keeps the PRODUCTION_TASK event source template aligned with the status dictionary', () => {
    const template = BUSINESS_EVENT_SOURCE_TEMPLATES.find(
      (item) => item.code === 'PRODUCTION_TASK'
    )

    expect(template?.config.statuses.map((item) => item.code)).toEqual(
      productionTaskStatuses
    )
  })
})
