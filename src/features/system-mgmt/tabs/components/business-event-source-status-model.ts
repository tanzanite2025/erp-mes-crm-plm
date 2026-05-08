import {
  createBusinessEventConfigItemId,
  type BusinessEventSource,
  type BusinessStatus,
} from '../../workflow-core/data/business-event-source-schema'
import {
  moveBusinessEventConfigItem,
  removeBusinessEventConfigItemAt,
  restoreBusinessEventConfigItem,
  updateBusinessEventConfigItemAt,
} from './business-event-source-card-model-common'
import { updateBusinessEventSourceConfig } from './business-event-source-source-model'

export function createBusinessStatusDraft(): BusinessStatus {
  return {
    id: createBusinessEventConfigItemId('status'),
    code: 'CustomStatus',
  }
}

export function appendBusinessStatus(
  source: BusinessEventSource,
  status: BusinessStatus = createBusinessStatusDraft()
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    statuses: [...source.config.statuses, status],
  })
}

export function updateBusinessStatusAt(
  source: BusinessEventSource,
  index: number,
  updates: Partial<BusinessStatus>
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    statuses: updateBusinessEventConfigItemAt(
      source.config.statuses,
      index,
      updates
    ),
  })
}

export function moveBusinessStatus(
  source: BusinessEventSource,
  index: number,
  direction: -1 | 1
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    statuses: moveBusinessEventConfigItem(
      source.config.statuses,
      index,
      index + direction
    ),
  })
}

export function removeBusinessStatusAt(
  source: BusinessEventSource,
  index: number
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    statuses: removeBusinessEventConfigItemAt(source.config.statuses, index),
  })
}

export function restoreBusinessStatus(
  source: BusinessEventSource,
  status: BusinessStatus
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    statuses: restoreBusinessEventConfigItem(source.config.statuses, status),
  })
}

export function getBusinessEventStatusSummary(source: BusinessEventSource) {
  return `${source.config.statuses.length} 个唯一状态`
}
