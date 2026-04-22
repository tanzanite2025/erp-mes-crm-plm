import { describe, expect, it } from 'vitest'
import { BUSINESS_EVENT_SOURCE_TEMPLATES } from './business-event-source-templates'
import {
  normalizeProductionPlanStatus,
  productionPlanStatuses,
} from './production-plan-status'

describe('production-plan-status', () => {
  it('locks the unique production plan status dictionary', () => {
    expect(productionPlanStatuses).toEqual([
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELED',
    ])
  })

  it('rejects old plan statuses and task statuses', () => {
    expect(() => normalizeProductionPlanStatus('PLANNING')).toThrow(
      'Invalid production plan status: PLANNING'
    )
    expect(() => normalizeProductionPlanStatus('Scheduled')).toThrow(
      'Invalid production plan status: Scheduled'
    )
    expect(() => normalizeProductionPlanStatus('PENDING')).toThrow(
      'Invalid production plan status: PENDING'
    )
    expect(() => normalizeProductionPlanStatus('DONE')).toThrow(
      'Invalid production plan status: DONE'
    )
  })

  it('keeps the PRODUCTION_PLAN event source template aligned with the status dictionary', () => {
    const template = BUSINESS_EVENT_SOURCE_TEMPLATES.find(
      (item) => item.code === 'PRODUCTION_PLAN'
    )

    expect(template?.config.statuses.map((item) => item.code)).toEqual(
      productionPlanStatuses
    )
  })
})
