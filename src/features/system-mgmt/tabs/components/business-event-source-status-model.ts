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
    code: 'Custom',
    label: '自定义状态',
    phase: 'custom',
    isTerminal: false,
    defaultResolve: false,
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
  const terminalCount = source.config.statuses.filter(
    (status) => status.isTerminal
  ).length
  return `${source.config.statuses.length} 状态 / ${terminalCount} 终态`
}
