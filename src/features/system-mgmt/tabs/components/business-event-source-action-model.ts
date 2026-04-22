import {
  createBusinessEventConfigItemId,
  type BusinessEventAction,
  type BusinessEventSource,
} from '../../workflow-core/data/business-event-source-schema'
import {
  removeBusinessEventConfigItemAt,
  restoreBusinessEventConfigItem,
  updateBusinessEventConfigItemAt,
} from './business-event-source-card-model-common'
import { updateBusinessEventSourceConfig } from './business-event-source-source-model'

export function createBusinessEventActionDraft(): BusinessEventAction {
  return {
    id: createBusinessEventConfigItemId('action'),
    code: 'CUSTOM_ACTION',
    name: '自定义动作',
    kind: 'custom',
  }
}

export function appendBusinessEventAction(
  source: BusinessEventSource,
  action: BusinessEventAction = createBusinessEventActionDraft()
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    actions: [...source.config.actions, action],
  })
}

export function updateBusinessEventActionAt(
  source: BusinessEventSource,
  index: number,
  updates: Partial<BusinessEventAction>
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    actions: updateBusinessEventConfigItemAt(
      source.config.actions,
      index,
      updates
    ),
  })
}

export function removeBusinessEventActionAt(
  source: BusinessEventSource,
  index: number
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    actions: removeBusinessEventConfigItemAt(source.config.actions, index),
  })
}

export function restoreBusinessEventAction(
  source: BusinessEventSource,
  action: BusinessEventAction
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    actions: restoreBusinessEventConfigItem(source.config.actions, action),
  })
}
