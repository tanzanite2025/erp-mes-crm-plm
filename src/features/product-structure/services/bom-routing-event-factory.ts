import type { BOM } from '../data/schema'
import {
  BOM_ENGINEERING_SOURCE_CODE,
  BOM_MANUFACTURING_SOURCE_CODE,
  BOM_NOTIFICATION_TYPE,
  type BomEngineeringSemanticAction,
  type BomManufacturingSemanticAction,
} from './bom-routing-event-factory-constants'
import {
  buildEbomMetadata,
  buildMbomMetadata,
  mapMbomStatusToEventStatus,
  withTemplateKeyAliases,
  type BuildEbomMetadataInput,
  type BuildMbomMetadataInput,
} from './bom-routing-metadata'

export {
  BOM_ENGINEERING_SOURCE_CODE,
  BOM_MANUFACTURING_SOURCE_CODE,
  BOM_NOTIFICATION_TYPE,
}
export type { BomEngineeringSemanticAction, BomManufacturingSemanticAction }

const EBOM_ACTION_LABEL: Record<BomEngineeringSemanticAction, string> = {
  CREATED: '已创建',
  SUBMITTED_FOR_REVIEW: '已提交审核',
  APPROVED: '审批通过',
  REJECTED: '已驳回',
  RELEASED: '已发布',
  DERIVED: '已被派生为 MBOM',
  OBSOLETED: '已作废',
}

const MBOM_ACTION_LABEL: Record<BomManufacturingSemanticAction, string> = {
  CREATED_FROM_EBOM: '已由 EBOM 派生',
  REVISED: '工艺修订完成（已产生新版本）',
  MARKED_PENDING_REVISION: '研发侧正在优化',
  CLEARED_PENDING_REVISION: '研发侧优化已结束',
  MARKED_STALE: '关联 EBOM 已升级，待跟进',
  OBSOLETED: '已作废',
}

function buildEbomTitle(bom: BOM, action: BomEngineeringSemanticAction) {
  return `研发 BOM ${bom.bomNo || bom.id} ${EBOM_ACTION_LABEL[action]}`
}

function buildEbomContent(bom: BOM, action: BomEngineeringSemanticAction) {
  return `${bom.bomNo || '(未编号)'} 当前状态：${bom.status}。${EBOM_ACTION_LABEL[action]}`
}

function buildMbomTitle(bom: BOM, action: BomManufacturingSemanticAction) {
  return `生产 BOM ${bom.bomNo || bom.id} ${MBOM_ACTION_LABEL[action]}`
}

function buildMbomContent(bom: BOM, action: BomManufacturingSemanticAction) {
  const eventStatus = mapMbomStatusToEventStatus(bom.status)
  return `${bom.bomNo || '(未编号)'} 当前状态：${eventStatus}。${MBOM_ACTION_LABEL[action]}`
}

/**
 * 构造 EBOM 路由事件。CREATED 用 CREATED action，DERIVED 是个特例（不改自身状态），
 * 其它都用 STATUS_CHANGED。
 */
export function buildBomEngineeringRoutingEvent(input: BuildEbomMetadataInput) {
  const { bom, semanticAction } = input
  let action: string
  if (semanticAction === 'CREATED') {
    action = 'CREATED'
  } else if (semanticAction === 'DERIVED') {
    action = 'DERIVED'
  } else {
    action = 'STATUS_CHANGED'
  }

  return {
    type: BOM_NOTIFICATION_TYPE,
    action,
    sourceCode: BOM_ENGINEERING_SOURCE_CODE,
    targetStatus: bom.status,
    title: buildEbomTitle(bom, semanticAction),
    content: buildEbomContent(bom, semanticAction),
    actionUrl: `/product-structure/bom?bomId=${bom.id}&bomType=EBOM`,
    metadata: withTemplateKeyAliases(buildEbomMetadata(input)),
  }
}

/**
 * 构造 MBOM 路由事件。CREATED_FROM_EBOM 用 CREATED_FROM_EBOM action，
 * 其它都按各自的 custom action 处理。
 */
export function buildBomManufacturingRoutingEvent(
  input: BuildMbomMetadataInput
) {
  const { bom, semanticAction } = input
  const action =
    semanticAction === 'CREATED_FROM_EBOM'
      ? 'CREATED_FROM_EBOM'
      : semanticAction

  return {
    type: BOM_NOTIFICATION_TYPE,
    action,
    sourceCode: BOM_MANUFACTURING_SOURCE_CODE,
    targetStatus: mapMbomStatusToEventStatus(bom.status),
    title: buildMbomTitle(bom, semanticAction),
    content: buildMbomContent(bom, semanticAction),
    actionUrl: `/product-structure/bom?bomId=${bom.id}&bomType=MBOM`,
    metadata: withTemplateKeyAliases(buildMbomMetadata(input)),
  }
}
