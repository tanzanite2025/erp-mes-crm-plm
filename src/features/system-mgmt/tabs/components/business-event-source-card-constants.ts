import {
  type BusinessDynamicResolver,
  type BusinessEventAction,
  type BusinessEventField,
  type BusinessEventSource,
  type BusinessStatus,
} from '../../workflow-core/data/business-event-source-schema'

export const ENTITY_OPTIONS: ReadonlyArray<BusinessEventSource['entity']> = [
  'ORDER',
  'BOM',
  'PRODUCT',
  'MOLD',
  'SYSTEM',
]

export const ACTION_KIND_OPTIONS: BusinessEventAction['kind'][] = [
  'created',
  'updated',
  'deleted',
  'status',
  'custom',
]

export const STATUS_PHASE_OPTIONS: BusinessStatus['phase'][] = [
  'draft',
  'pending',
  'active',
  'done',
  'cancelled',
  'terminal',
  'custom',
]

export const FIELD_TYPE_OPTIONS: BusinessEventField['type'][] = [
  'string',
  'number',
  'date',
  'user',
  'boolean',
  'object',
]

export const RESOLVER_TYPE_OPTIONS: BusinessDynamicResolver['type'][] = [
  'user',
  'role',
  'permission',
]
