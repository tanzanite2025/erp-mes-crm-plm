import {
  type BusinessEventSource,
  type BusinessEventSourceConfig,
  normalizeBusinessEventSourceConfig,
} from '../../workflow-core/data/business-event-source-schema'

type BusinessEventSourceDraftFields = Pick<
  BusinessEventSource,
  'name' | 'description' | 'code' | 'module' | 'entity' | 'enabled'
>

export function cloneBusinessEventSourceConfig(
  config?: Partial<BusinessEventSourceConfig>
): BusinessEventSourceConfig {
  return normalizeBusinessEventSourceConfig(config)
}

export function updateBusinessEventSourceDraft(
  source: BusinessEventSource,
  updates: Partial<BusinessEventSourceDraftFields>
): BusinessEventSource {
  return {
    ...source,
    ...updates,
  }
}

export function updateBusinessEventSourceConfig(
  source: BusinessEventSource,
  updates: Partial<BusinessEventSourceConfig>
): BusinessEventSource {
  return {
    ...source,
    config: cloneBusinessEventSourceConfig({
      ...cloneBusinessEventSourceConfig(source.config),
      ...updates,
    }),
  }
}
