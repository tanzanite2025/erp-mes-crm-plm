/**
 * BOM 路由事件 metadata 的 schema 与构造工具。
 *
 * 历史背景：通知模板（business-event-source-templates/bom-engineering.ts 等）
 * 用 PascalCase 的 `templateKey`（如 `BomId`、`SourceEbomNo`），而代码里其它地方
 * 用 camelCase（如 `bomId`、`sourceEbomNo`）。早期实现是在每个字段上手写两份键，
 * 维护成本高且容易漏。本文件做两件事：
 *   1. 用 zod 把 metadata 约束成强类型（EBOM / MBOM 各一份）
 *   2. 通过 {@link withTemplateKeyAliases} 自动派生 PascalCase 别名，
 *      不再让上游手动复写"两套键"
 *
 * 添加新字段（例如未来要接入的 customerId）时，只需在对应 schema 中加一项 +
 * 在 builder 中传值，PascalCase 别名会自动同步。
 */
import { z } from 'zod'
import { type BOM } from '../data/schema'
import {
  BOM_ENGINEERING_SOURCE_CODE,
  BOM_MANUFACTURING_SOURCE_CODE,
  type BomEngineeringSemanticAction,
  type BomManufacturingSemanticAction,
} from './bom-routing-event-factory-constants'

/**
 * 把对象的 camelCase 字段镜像为 PascalCase 别名。
 *
 * 例：`{ bomId: 'a', sourceEbomNo: 'b' }`
 *  → `{ bomId: 'a', BomId: 'a', sourceEbomNo: 'b', SourceEbomNo: 'b' }`
 *
 * 仅处理纯 ASCII 首字母小写的 key；其它 key 原样保留。
 * undefined 字段不会跳过，与原值一同复制（保持原行为：模板渲染拿到 undefined 也认为字段存在）。
 */
export function withTemplateKeyAliases<T extends Record<string, unknown>>(
  obj: T
): T & Record<string, unknown> {
  const result: Record<string, unknown> = { ...obj }
  for (const key of Object.keys(obj)) {
    const first = key.charAt(0)
    if (first >= 'a' && first <= 'z') {
      const aliased = first.toUpperCase() + key.slice(1)
      if (!(aliased in result)) {
        result[aliased] = obj[key]
      }
    }
  }
  return result as T & Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Common metadata
// ---------------------------------------------------------------------------

/**
 * EBOM / MBOM 共有的 metadata 字段。提取出来避免双方各写一份。
 */
export const bomCommonMetadataSchema = z.object({
  id: z.string(),
  bomId: z.string(),
  bomNo: z.string(),
  bomVersion: z.string(),
  productId: z.string(),
  productName: z.string().optional(),
  bomType: z.enum(['EBOM', 'MBOM']),
  /** 数据层的真实状态（EBOM: DRAFT/REVIEWING/APPROVED/RELEASED/OBSOLETE; MBOM: 写入前已映射，见对应 schema）。 */
  status: z.string(),
  reason: z.string().optional(),
  /** 用于 NotificationService 路由到正确的事件源。 */
  sourceCode: z.string(),
})

export type BomCommonMetadata = z.infer<typeof bomCommonMetadataSchema>

// ---------------------------------------------------------------------------
// Engineering (EBOM) metadata
// ---------------------------------------------------------------------------

export const bomEngineeringSemanticActionSchema = z.enum([
  'CREATED',
  'SUBMITTED_FOR_REVIEW',
  'APPROVED',
  'REJECTED',
  'RELEASED',
  'DERIVED',
  'OBSOLETED',
])

export const bomEngineeringMetadataSchema = bomCommonMetadataSchema.extend({
  changeType: z.string().optional(),
  previousStatus: z.string().optional(),
  semanticAction: bomEngineeringSemanticActionSchema,
  createdBy: z.string().optional(),
  reviewer: z.string().optional(),
  approverComment: z.string().optional(),
  derivedMbomId: z.string().optional(),
})

export type BomEngineeringMetadata = z.infer<
  typeof bomEngineeringMetadataSchema
>

// ---------------------------------------------------------------------------
// Manufacturing (MBOM) metadata
// ---------------------------------------------------------------------------

export const bomManufacturingSemanticActionSchema = z.enum([
  'CREATED_FROM_EBOM',
  'REVISED',
  'MARKED_PENDING_REVISION',
  'CLEARED_PENDING_REVISION',
  'MARKED_STALE',
  'OBSOLETED',
])

/**
 * MBOM 在事件 metadata 上的状态字典是 EFFECTIVE / OBSOLETE，与数据层
 * RELEASED/OBSOLETE 不同。{@link mapMbomStatusToEventStatus} 负责映射。
 */
export const bomManufacturingEventStatusSchema = z.enum([
  'EFFECTIVE',
  'OBSOLETE',
])

export const bomManufacturingMetadataSchema = bomCommonMetadataSchema.extend({
  status: bomManufacturingEventStatusSchema,
  semanticAction: bomManufacturingSemanticActionSchema,
  sourceEbomId: z.string().optional(),
  sourceEbomNo: z.string().optional(),
  sourceEbomVersion: z.string().optional(),
  previousVersion: z.string().optional(),
  pendingRevisionEbomId: z.string().optional(),
  pendingRevisionEbomVersionId: z.string().optional(),
  currentVersionId: z.string().optional(),
  processEngineer: z.string().optional(),
  productionPlanner: z.string().optional(),
})

export type BomManufacturingMetadata = z.infer<
  typeof bomManufacturingMetadataSchema
>

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * 由 BOM 实体构造共有 metadata 字段。
 *
 * 调用方需自行决定 sourceCode（EBOM_ENGINEERING_SOURCE_CODE / MANUFACTURING）
 * 与 status（MBOM 路径会传映射后的事件态）。
 */
function buildCommonMetadata(params: {
  bom: BOM
  sourceCode: string
  /** 覆写 bom.status —— MBOM 路径需要传 EFFECTIVE/OBSOLETE。 */
  statusOverride?: string
  reason?: string
}): BomCommonMetadata {
  const { bom, sourceCode, statusOverride, reason } = params
  return {
    id: bom.id,
    bomId: bom.id,
    bomNo: bom.bomNo,
    bomVersion: bom.bomVersion,
    productId: bom.productId,
    productName: bom.product?.name,
    bomType: bom.bomType,
    status: statusOverride ?? bom.status,
    reason,
    sourceCode,
  }
}

/**
 * 数据层状态 → MBOM 事件态映射。
 */
export function mapMbomStatusToEventStatus(
  status: BOM['status']
): 'EFFECTIVE' | 'OBSOLETE' {
  return status === 'OBSOLETE' ? 'OBSOLETE' : 'EFFECTIVE'
}

export interface BuildEbomMetadataInput {
  bom: BOM
  semanticAction: BomEngineeringSemanticAction
  previousStatus?: BOM['status']
  derivedMbomId?: string
  reason?: string
  approverComment?: string
  reviewer?: string
}

export function buildEbomMetadata(
  input: BuildEbomMetadataInput
): BomEngineeringMetadata {
  const common = buildCommonMetadata({
    bom: input.bom,
    sourceCode: BOM_ENGINEERING_SOURCE_CODE,
    reason: input.reason,
  })
  return {
    ...common,
    changeType: input.bom.changeType,
    previousStatus: input.previousStatus,
    semanticAction: input.semanticAction,
    createdBy: input.bom.createdBy,
    reviewer: input.reviewer,
    approverComment: input.approverComment,
    derivedMbomId: input.derivedMbomId,
  }
}

export interface BuildMbomMetadataInput {
  bom: BOM
  semanticAction: BomManufacturingSemanticAction
  sourceEbomNo?: string
  sourceEbomVersion?: string
  previousVersion?: string
  pendingRevisionEbomId?: string
  pendingRevisionEbomVersionId?: string
  currentVersionId?: string
  reason?: string
  processEngineer?: string
  productionPlanner?: string
}

export function buildMbomMetadata(
  input: BuildMbomMetadataInput
): BomManufacturingMetadata {
  const eventStatus = mapMbomStatusToEventStatus(input.bom.status)
  const common = buildCommonMetadata({
    bom: input.bom,
    sourceCode: BOM_MANUFACTURING_SOURCE_CODE,
    statusOverride: eventStatus,
    reason: input.reason,
  })
  return {
    ...common,
    status: eventStatus,
    semanticAction: input.semanticAction,
    sourceEbomId: input.bom.sourceEbomId ?? undefined,
    sourceEbomNo: input.sourceEbomNo,
    sourceEbomVersion: input.sourceEbomVersion,
    previousVersion: input.previousVersion,
    pendingRevisionEbomId: input.pendingRevisionEbomId,
    pendingRevisionEbomVersionId: input.pendingRevisionEbomVersionId,
    currentVersionId: input.currentVersionId,
    processEngineer: input.processEngineer,
    productionPlanner: input.productionPlanner,
  }
}
