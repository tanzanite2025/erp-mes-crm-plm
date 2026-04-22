import {
  createBusinessEventConfigItemId,
  type BusinessEventField,
  type BusinessEventSource,
} from '../../workflow-core/data/business-event-source-schema'
import {
  removeBusinessEventConfigItemAt,
  restoreBusinessEventConfigItem,
  updateBusinessEventConfigItemAt,
} from './business-event-source-card-model-common'
import { updateBusinessEventSourceConfig } from './business-event-source-source-model'

export function createBusinessEventFieldDraft(): BusinessEventField {
  return {
    id: createBusinessEventConfigItemId('field'),
    key: 'customField',
    label: '自定义字段',
    path: 'customField',
    type: 'string',
    templateKey: 'CustomField',
    templateEnabled: true,
    dynamicResolver: false,
  }
}

export function appendBusinessEventField(
  source: BusinessEventSource,
  field: BusinessEventField = createBusinessEventFieldDraft()
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    fields: [...source.config.fields, field],
  })
}

export function updateBusinessEventFieldAt(
  source: BusinessEventSource,
  index: number,
  updates: Partial<BusinessEventField>
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    fields: updateBusinessEventConfigItemAt(
      source.config.fields,
      index,
      updates
    ),
  })
}

export function removeBusinessEventFieldAt(
  source: BusinessEventSource,
  index: number
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    fields: removeBusinessEventConfigItemAt(source.config.fields, index),
  })
}

export function restoreBusinessEventField(
  source: BusinessEventSource,
  field: BusinessEventField
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    fields: restoreBusinessEventConfigItem(source.config.fields, field),
  })
}

export function getBusinessEventFieldSummary(source: BusinessEventSource) {
  const templateCount = source.config.fields.filter(
    (field) => field.templateEnabled
  ).length
  return `${source.config.fields.length} 字段 / ${templateCount} 模板变量`
}
