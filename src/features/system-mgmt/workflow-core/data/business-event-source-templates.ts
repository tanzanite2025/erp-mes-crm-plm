import { DEFAULT_BOM_ENGINEERING_EVENT_SOURCE } from './business-event-source-templates/bom-engineering'
import { DEFAULT_BOM_MANUFACTURING_EVENT_SOURCE } from './business-event-source-templates/bom-manufacturing'
import { DEFAULT_LOGISTICS_RECORD_EVENT_SOURCE } from './business-event-source-templates/logistics-record'
import { DEFAULT_PRODUCTION_OUTSOURCE_EVENT_SOURCE } from './business-event-source-templates/production-outsource'
import { DEFAULT_PRODUCTION_PLAN_EVENT_SOURCE } from './business-event-source-templates/production-plan'
import { DEFAULT_PRODUCTION_TASK_EVENT_SOURCE } from './business-event-source-templates/production-task'
import { DEFAULT_PURCHASE_ORDER_EVENT_SOURCE } from './business-event-source-templates/purchase-order'
import { DEFAULT_QUALITY_STANDARD_EVENT_SOURCE } from './business-event-source-templates/quality-standard'
import { DEFAULT_SALES_ORDER_EVENT_SOURCE } from './business-event-source-templates/sales-order'
import { type BusinessEventSourceTemplate } from './business-event-source-types'

/**
 * 业务事件源模板的单一注册点。
 *
 * 每个模板必须包含 `meta` 字段，标识：
 * - 运行时覆盖度（connected / preconnected / template-only）
 * - 实时入口的 NotificationType
 * - 是否强制使用 STATUS_CHANGED action
 * - 是否作为 fallback 兜底
 *
 * 加新事件源只需要：
 *   1. 在 templates/ 下新增模板文件并 import 进这里
 *   2. 在 business-event-status-catalog.ts 注册状态字典（即将合并到 meta）
 *
 * 不再需要修改 target-resolver / notification-rule-schema / use-business-event-sources。
 */
export const BUSINESS_EVENT_SOURCE_TEMPLATES: BusinessEventSourceTemplate[] = [
  DEFAULT_SALES_ORDER_EVENT_SOURCE,
  DEFAULT_PURCHASE_ORDER_EVENT_SOURCE,
  DEFAULT_LOGISTICS_RECORD_EVENT_SOURCE,
  DEFAULT_PRODUCTION_PLAN_EVENT_SOURCE,
  DEFAULT_PRODUCTION_TASK_EVENT_SOURCE,
  DEFAULT_PRODUCTION_OUTSOURCE_EVENT_SOURCE,
  DEFAULT_QUALITY_STANDARD_EVENT_SOURCE,
  DEFAULT_BOM_ENGINEERING_EVENT_SOURCE,
  DEFAULT_BOM_MANUFACTURING_EVENT_SOURCE,
]

/**
 * 通过 sourceCode 取模板的便捷查询。
 */
export function getBusinessEventSourceTemplateByCode(
  sourceCode: string
): BusinessEventSourceTemplate | undefined {
  const normalized = sourceCode.trim().toUpperCase()
  return BUSINESS_EVENT_SOURCE_TEMPLATES.find(
    (template) => template.code === normalized
  )
}

/**
 * 通过 NotificationType 反查 sourceCode。
 * 同一个 type 可能对应多个 sourceCode（如 ORDER_EVENT），首个匹配项即为默认。
 */
export function getBusinessEventSourceCodesByNotificationType(
  notificationType: string
): string[] {
  return BUSINESS_EVENT_SOURCE_TEMPLATES.filter(
    (template) => template.meta.notificationType === notificationType
  ).map((template) => template.code)
}
