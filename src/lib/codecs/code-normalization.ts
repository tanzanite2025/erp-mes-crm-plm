import { format } from 'date-fns'

export function normalizeMachineCode(value?: string | null): string {
  return (value || '').replace(/\s+/g, '').trim().toUpperCase()
}

export function normalizeTrackingCode(value?: string | null): string {
  return (value || '').replace(/\s+/g, '').trim().toUpperCase()
}

export function normalizeMaterialCode(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeDeviceCode(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeComponentKey(value?: string | null, fallback = 'GENERAL'): string {
  const normalized = (value || '').trim().toUpperCase()
  return normalized || fallback
}

export function normalizeSku(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeModelCode(value?: string | null, fallback = '01'): string {
  const normalized = (value || '').replace(/\D/g, '').slice(0, 2)
  return normalized || fallback
}

export function normalizeTemplateKey(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeSiteCode(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeChangeOrderNo(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeRevisionNo(value?: string | null, fallback = 'R1'): string {
  const normalized = (value || '').trim().toUpperCase()
  return normalized || fallback
}

export function normalizeBomNo(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeBomVersion(value?: string | null, fallback = 'V1.0'): string {
  const normalized = (value || '').trim().toUpperCase()
  return normalized || fallback
}

export function deriveBomDisplayVersion(bomVersion?: string | null): string {
  return normalizeBomVersion(bomVersion)
}

const BOM_CHANGE_TYPES = new Set(['MANUAL', 'ECO', 'ECN'])

/**
 * EBOM (研发 BOM) 状态机的有序序列。
 * 完整生命周期：DRAFT → REVIEWING → APPROVED → RELEASED → OBSOLETE。
 * 没有 VALIDATING（设计审批通过即发布，不再需要单独的"验证中"状态）。
 */
export const EBOM_STATUS_ORDER = [
  'DRAFT',
  'REVIEWING',
  'APPROVED',
  'RELEASED',
  'OBSOLETE',
] as const

export type EbomStatus = (typeof EBOM_STATUS_ORDER)[number]

/**
 * MBOM (生产 BOM) 在数据存储层的状态字典。
 * 派生即生效（RELEASED），无中间审批态。
 */
export const MBOM_STATUS_ORDER = ['RELEASED', 'OBSOLETE'] as const

export type MbomStatus = (typeof MBOM_STATUS_ORDER)[number]

/**
 * MBOM 在通知事件 metadata 中暴露的语义状态字典。
 * RELEASED 在事件层映射为 EFFECTIVE，便于业务方理解。
 */
export const MBOM_EVENT_STATUS_ORDER = ['EFFECTIVE', 'OBSOLETE'] as const

export type MbomEventStatus = (typeof MBOM_EVENT_STATUS_ORDER)[number]

/**
 * BOM 状态字典 Source of Truth。
 * 这是数据层 status 字段的合法取值集合（EBOM 与 MBOM 共用同一张表，status 列共享字典）。
 */
export const BOM_STATUS_ORDER = EBOM_STATUS_ORDER

export type BomStatus = (typeof BOM_STATUS_ORDER)[number]

const BOM_STATUSES = new Set<string>(BOM_STATUS_ORDER)

/**
 * 按 BOM 类型获取在表单/UI 上可选的状态字典。
 * - EBOM：完整 5 状态
 * - MBOM：仅 RELEASED / OBSOLETE
 */
export function getBomStatusOrderByType(bomType?: string | null): readonly BomStatus[] {
  const normalized = (bomType || '').trim().toUpperCase()
  if (normalized === 'MBOM') {
    return MBOM_STATUS_ORDER
  }
  return EBOM_STATUS_ORDER
}

export const ENGINEERING_DATE_PROTOCOL_FORMAT = 'yyyy-MM-dd'
export const ENGINEERING_OPTIONAL_DATE_PROTOCOL_REGEX = /^$|^\d{4}-\d{2}-\d{2}$/
export const ENGINEERING_DATE_PROTOCOL_VALIDATION_MESSAGE = 'Date must follow YYYY-MM-DD format'

export function formatEngineeringDateProtocol(date: Date): string {
  return format(date, ENGINEERING_DATE_PROTOCOL_FORMAT)
}

export function normalizeEngineeringDateProtocol(value?: string | null): string {
  return (value || '').trim().slice(0, 10)
}

export function normalizeBomChangeType(value?: string | null, fallback = 'MANUAL'): 'MANUAL' | 'ECO' | 'ECN' {
  const normalized = (value || '').trim().toUpperCase()
  if (BOM_CHANGE_TYPES.has(normalized)) {
    return normalized as 'MANUAL' | 'ECO' | 'ECN'
  }
  return fallback as 'MANUAL' | 'ECO' | 'ECN'
}

export function normalizeBomStatus(value?: string | null, fallback = 'DRAFT'): string {
  const normalized = (value || '').trim().toUpperCase()
  if (BOM_STATUSES.has(normalized)) {
    return normalized
  }
  return fallback
}

export function normalizeSceneKey(value?: string | null, fallback = 'general'): string {
  const normalized = (value || '').trim().toLowerCase()
  return normalized || fallback
}

export function normalizeTaskKey(value?: string | null): string {
  return (value || '').trim()
}
