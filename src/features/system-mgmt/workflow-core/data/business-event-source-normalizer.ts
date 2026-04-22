import { z } from 'zod'
import { DEFAULT_SALES_ORDER_EVENT_SOURCE } from './business-event-source-templates/sales-order'
import {
	EMPTY_BUSINESS_EVENT_SOURCE_CONFIG,
	businessEventSourceSchema,
	businessEventSourceCreateSchema,
	businessEventSourceTemplateSchema,
	businessEventSourceUpdateSchema,
	type BusinessConfigItemBase,
	type BusinessEventSource,
	type BusinessEventSourceConfig,
	type BusinessEventSourceCreatePayload,
	type BusinessEventSourceTemplate,
	type BusinessEventSourceUpdatePayload,
} from './business-event-source-types'

const NON_ID_CHAR_PATTERN = /[^a-z0-9]+/g
let businessEventConfigItemCounter = 0

function slugifyBusinessEventIdPart(value?: string) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(NON_ID_CHAR_PATTERN, '-')
    .replace(/^-+|-+$/g, '')
}

function buildLegacyBusinessEventConfigItemId(
  prefix: string,
  index: number,
  ...parts: Array<string | undefined>
) {
  const base = parts
    .map((part) => slugifyBusinessEventIdPart(part))
    .filter(Boolean)
    .join('-')
  return `${prefix}-${base || `item-${index + 1}`}-${index + 1}`
}

export function createBusinessEventConfigItemId(prefix: string) {
  businessEventConfigItemCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${businessEventConfigItemCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export function syncBusinessConfigItemOrder<T extends BusinessConfigItemBase>(
  items: T[]
): T[] {
  return items.map((item, index) => ({
    ...item,
    order: index,
  }))
}

function normalizeBusinessConfigItems<T extends BusinessConfigItemBase>(
  items: T[] | undefined,
  prefix: string,
  getLegacyParts: (item: T) => Array<string | undefined>
): T[] {
  return syncBusinessConfigItemOrder(
    (items ?? []).map((item, index) => ({
      ...item,
      id:
        item.id ??
        buildLegacyBusinessEventConfigItemId(
          prefix,
          index,
          ...getLegacyParts(item)
        ),
    }))
  )
}

export function normalizeBusinessEventSourceConfig(
  config?: Partial<BusinessEventSourceConfig>
): BusinessEventSourceConfig {
  return {
    ...EMPTY_BUSINESS_EVENT_SOURCE_CONFIG,
    ...config,
    actions: normalizeBusinessConfigItems(
      config?.actions,
      'action',
      (action) => [action.code, action.name]
    ),
    statuses: normalizeBusinessConfigItems(
      config?.statuses,
      'status',
      (status) => [status.code, status.label]
    ),
    fields: normalizeBusinessConfigItems(config?.fields, 'field', (field) => [
      field.key,
      field.path,
    ]),
    dynamicResolvers: normalizeBusinessConfigItems(
      config?.dynamicResolvers,
      'resolver',
      (resolver) => [resolver.code, resolver.path]
    ),
  }
}

export function normalizeBusinessEventSource(
  source: BusinessEventSource
): BusinessEventSource {
  return {
    ...source,
    config: normalizeBusinessEventSourceConfig(source.config),
  }
}

export function normalizeBusinessEventSourceTemplate(
  source: BusinessEventSourceTemplate
): BusinessEventSourceTemplate {
  return {
    ...source,
    config: normalizeBusinessEventSourceConfig(source.config),
  }
}

export function deserializeBusinessEventSource(
  input: unknown
): BusinessEventSource {
  return normalizeBusinessEventSource(businessEventSourceSchema.parse(input))
}

export function deserializeBusinessEventSources(
  input: unknown
): BusinessEventSource[] {
  return z
    .array(businessEventSourceSchema)
    .parse(input)
    .map((source) => {
      return normalizeBusinessEventSource(source)
    })
}

export function serializeBusinessEventSourceCreate(
  source: BusinessEventSourceCreatePayload
): BusinessEventSourceCreatePayload {
  const parsed = businessEventSourceCreateSchema.parse(source)
  return {
    ...parsed,
    config: normalizeBusinessEventSourceConfig(parsed.config),
  }
}

export function serializeBusinessEventSourceUpdate(
  source: BusinessEventSourceUpdatePayload
): BusinessEventSourceUpdatePayload {
  const parsed = businessEventSourceUpdateSchema.parse(source)
  return {
    ...parsed,
    config: normalizeBusinessEventSourceConfig(parsed.config),
  }
}

export function deserializeBusinessEventSourceTemplate(
  input: unknown
): BusinessEventSourceTemplate {
  return normalizeBusinessEventSourceTemplate(
    businessEventSourceTemplateSchema.parse(input)
  )
}

export function materializeBusinessEventSourceTemplate(
  template: BusinessEventSourceTemplate,
  overrides: Partial<Pick<BusinessEventSource, 'id' | 'createdAt' | 'updatedAt'>> = {}
): BusinessEventSource {
  return normalizeBusinessEventSource({
    ...template,
    id: overrides.id ?? `template-${template.code.toLowerCase()}`,
    createdAt: overrides.createdAt,
    updatedAt: overrides.updatedAt,
  })
}

export function getEventSourceStatusOptions(source?: BusinessEventSource) {
  return (
    source?.config.statuses ?? DEFAULT_SALES_ORDER_EVENT_SOURCE.config.statuses
  ).map((status) => ({
    value: status.code,
    label: `${status.label} (${status.code})`,
  }))
}
