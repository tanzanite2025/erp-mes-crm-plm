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

export function normalizeComponentKey(
  value?: string | null,
  fallback = 'GENERAL'
): string {
  const normalized = (value || '').trim().toUpperCase()
  return normalized || fallback
}

export function normalizeSku(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeModelCode(
  value?: string | null,
  fallback = '01'
): string {
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

export function normalizeRevisionNo(
  value?: string | null,
  fallback = 'R1'
): string {
  const normalized = (value || '').trim().toUpperCase()
  return normalized || fallback
}

export function normalizeBomNo(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeBomVersion(
  value?: string | null,
  fallback = 'V1.0'
): string {
  const normalized = (value || '').trim().toUpperCase()
  return normalized || fallback
}

export function deriveBomDisplayVersion(bomVersion?: string | null): string {
  return normalizeBomVersion(bomVersion)
}

const BOM_CHANGE_TYPES = new Set(['MANUAL', 'ECO', 'ECN'])

/**
 * EBOM 读取字典，保留历史 REVIEWING / APPROVED 数据兼容。
 * 当前可操作生命周期使用 BOM_CURRENT_LIFECYCLE_STATUS_ORDER。
 */
export const EBOM_STATUS_ORDER = [
  'DRAFT',
  'REVIEWING',
  'APPROVED',
  'RELEASED',
  'OBSOLETE',
] as const

export type EbomStatus = (typeof EBOM_STATUS_ORDER)[number]

/** 研发和生产 BOM 共用的当前生命周期；历史中间态仅保留读取。 */
export const BOM_CURRENT_LIFECYCLE_STATUS_ORDER = [
  'DRAFT',
  'RELEASED',
  'OBSOLETE',
] as const

/** 生产 BOM 派生为草稿，核对后直接发布。 */
export const MBOM_STATUS_ORDER = BOM_CURRENT_LIFECYCLE_STATUS_ORDER

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
 * 获取当前表单/UI 使用的三态字典，研发和生产 BOM 使用同一流程。
 * 保留类型参数以兼容既有调用；历史状态解析使用 BOM_STATUS_ORDER。
 */
export function getBomStatusOrderByType(
  _bomType?: string | null
): readonly BomStatus[] {
  return BOM_CURRENT_LIFECYCLE_STATUS_ORDER
}

export const ENGINEERING_DATE_PROTOCOL_FORMAT = 'yyyy-MM-dd'
export const ENGINEERING_OPTIONAL_DATE_PROTOCOL_REGEX = /^$|^\d{4}-\d{2}-\d{2}$/
export const ENGINEERING_DATE_PROTOCOL_VALIDATION_MESSAGE =
  'Date must follow YYYY-MM-DD format'

export function formatEngineeringDateProtocol(date: Date): string {
  return format(date, ENGINEERING_DATE_PROTOCOL_FORMAT)
}

export function normalizeEngineeringDateProtocol(
  value?: string | null
): string {
  return (value || '').trim().slice(0, 10)
}

export function normalizeBomChangeType(
  value?: string | null,
  fallback = 'MANUAL'
): 'MANUAL' | 'ECO' | 'ECN' {
  const normalized = (value || '').trim().toUpperCase()
  if (BOM_CHANGE_TYPES.has(normalized)) {
    return normalized as 'MANUAL' | 'ECO' | 'ECN'
  }
  return fallback as 'MANUAL' | 'ECO' | 'ECN'
}

export function normalizeBomStatus(
  value?: string | null,
  fallback = 'DRAFT'
): string {
  const normalized = (value || '').trim().toUpperCase()
  if (BOM_STATUSES.has(normalized)) {
    return normalized
  }
  return fallback
}

export function normalizeSceneKey(
  value?: string | null,
  fallback = 'general'
): string {
  const normalized = (value || '').trim().toLowerCase()
  return normalized || fallback
}

export function normalizeTaskKey(value?: string | null): string {
  return (value || '').trim()
}
