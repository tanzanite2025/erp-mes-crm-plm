import {
  createBusinessEventConfigItemId,
  type BusinessDynamicResolver,
  type BusinessEventSource,
} from '../../workflow-core/data/business-event-source-schema'
import {
  removeBusinessEventConfigItemAt,
  restoreBusinessEventConfigItem,
  updateBusinessEventConfigItemAt,
} from './business-event-source-card-model-common'
import { updateBusinessEventSourceConfig } from './business-event-source-source-model'

export function createBusinessDynamicResolverDraft(): BusinessDynamicResolver {
  return {
    id: createBusinessEventConfigItemId('resolver'),
    code: 'custom.user',
    label: '自定义用户来源',
    path: 'custom.user',
    type: 'user',
  }
}

export function appendBusinessDynamicResolver(
  source: BusinessEventSource,
  resolver: BusinessDynamicResolver = createBusinessDynamicResolverDraft()
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    dynamicResolvers: [...source.config.dynamicResolvers, resolver],
  })
}

export function updateBusinessDynamicResolverAt(
  source: BusinessEventSource,
  index: number,
  updates: Partial<BusinessDynamicResolver>
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    dynamicResolvers: updateBusinessEventConfigItemAt(
      source.config.dynamicResolvers,
      index,
      updates
    ),
  })
}

export function removeBusinessDynamicResolverAt(
  source: BusinessEventSource,
  index: number
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    dynamicResolvers: removeBusinessEventConfigItemAt(
      source.config.dynamicResolvers,
      index
    ),
  })
}

export function restoreBusinessDynamicResolver(
  source: BusinessEventSource,
  resolver: BusinessDynamicResolver
): BusinessEventSource {
  return updateBusinessEventSourceConfig(source, {
    dynamicResolvers: restoreBusinessEventConfigItem(
      source.config.dynamicResolvers,
      resolver
    ),
  })
}
