import {
  type BusinessEventSource,
  type BusinessEventSourceCreatePayload,
  type BusinessEventSourceTemplate,
} from '../workflow-core/data/business-event-source-schema'
import { cloneBusinessEventSourceConfig } from './components/business-event-source-card-model'

export type EventSourceCreateInput = BusinessEventSourceCreatePayload

function getUniqueCode(baseCode: string, sources: BusinessEventSource[]) {
  const existing = new Set(sources.map((source) => source.code))
  if (!existing.has(baseCode)) return baseCode

  let index = 2
  while (existing.has(`${baseCode}_${index}`)) {
    index += 1
  }
  return `${baseCode}_${index}`
}

function cloneConfig(source: BusinessEventSourceTemplate) {
  return cloneBusinessEventSourceConfig(source.config)
}

function toCreateInput(
  source: BusinessEventSourceTemplate
): BusinessEventSourceCreatePayload {
  return {
    code: source.code,
    name: source.name,
    module: source.module,
    entity: source.entity,
    enabled: source.enabled,
    description: source.description,
    config: cloneConfig(source),
  }
}

function stripPersistenceFields(
  source: BusinessEventSourceTemplate
): EventSourceCreateInput {
  return toCreateInput(source)
}

export function createEventSourceFromTemplate(
  template: BusinessEventSourceTemplate,
  sources: BusinessEventSource[]
): EventSourceCreateInput {
  return {
    ...toCreateInput(template),
    code: getUniqueCode(template.code, sources),
  }
}

export function createDuplicateEventSource(
  source: BusinessEventSource,
  sources: BusinessEventSource[]
): EventSourceCreateInput {
  const base = stripPersistenceFields(source)
  return {
    ...base,
    code: getUniqueCode(`${source.code}_COPY`, sources),
    name: `${source.name} 副本`,
  }
}
