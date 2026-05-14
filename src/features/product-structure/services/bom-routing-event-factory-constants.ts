import type { NotificationType } from '@/features/system-mgmt/notifications/types'

export const BOM_NOTIFICATION_TYPE: NotificationType = 'BOM_EVENT'
export const BOM_ENGINEERING_SOURCE_CODE = 'BOM_ENGINEERING'
export const BOM_MANUFACTURING_SOURCE_CODE = 'BOM_MANUFACTURING'

/**
 * EBOM 语义动作（与 BOM_ENGINEERING 模板的 actions 对齐）。
 */
export type BomEngineeringSemanticAction =
  | 'CREATED'
  | 'SUBMITTED_FOR_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RELEASED'
  | 'DERIVED'
  | 'OBSOLETED'

/**
 * MBOM 语义动作（与 BOM_MANUFACTURING 模板的 actions 对齐）。
 *
 * 注意 MBOM 状态在数据层仍是 RELEASED/OBSOLETE 等，但事件 metadata 里
 * 会被映射成 EFFECTIVE/OBSOLETE 以匹配模板状态字典。
 */
export type BomManufacturingSemanticAction =
  | 'CREATED_FROM_EBOM'
  | 'REVISED'
  | 'MARKED_PENDING_REVISION'
  | 'CLEARED_PENDING_REVISION'
  | 'MARKED_STALE'
  | 'OBSOLETED'
