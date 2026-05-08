import { DEFAULT_SALES_ORDER_EVENT_SOURCE } from '../workflow-core/data/business-event-source-templates/sales-order'
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

export function createNewEventSource(): EventSourceCreateInput {
  const suffix = Date.now().toString().slice(-6)
  return {
    ...stripPersistenceFields(DEFAULT_SALES_ORDER_EVENT_SOURCE),
    code: `CUSTOM_SOURCE_${suffix}`,
    name: '新业务事件源',
    module: 'System',
    entity: 'SYSTEM',
    description: '为新的业务对象配置动作、状态、字段和通知变量。',
    config: {
      actions: [{ code: 'STATUS_CHANGED', name: '状态变更', kind: 'status' }],
      statuses: [{ code: 'Pending' }, { code: 'Done' }],
      fields: [
        {
          key: 'id',
          label: '业务ID',
          path: 'id',
          type: 'string',
          templateKey: 'BusinessId',
          templateEnabled: true,
          dynamicResolver: false,
        },
      ],
      dynamicResolvers: [],
      defaultActionUrlTemplate: '',
    },
    enabled: true,
  }
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
