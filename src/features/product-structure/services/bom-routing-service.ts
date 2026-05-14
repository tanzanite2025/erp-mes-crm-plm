import { createLogger } from '@/lib/logger'
import { NotificationService } from '@/features/system-mgmt/notifications/notification-service'
import type { BOM } from '../data/schema'
import { isEBOM, isMBOM } from '../utils/bom-identity'
import {
  buildBomEngineeringRoutingEvent,
  buildBomManufacturingRoutingEvent,
  type BomEngineeringSemanticAction,
  type BomManufacturingSemanticAction,
} from './bom-routing-event-factory'

const logger = createLogger('BomRoutingService')

interface DispatchEbomEventInput {
  bom: BOM
  semanticAction: BomEngineeringSemanticAction
  previousStatus?: BOM['status']
  derivedMbomId?: string
  reason?: string
  approverComment?: string
  reviewer?: string
}

interface DispatchMbomEventInput {
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

/**
 * 派发 EBOM (研发 BOM) 路由事件。
 *
 * 任何写入侧操作（saveBOM 创建、promoteBOM 状态推进、deriveMBOMFromEBOM 派生）
 * 成功后都应调用本函数，让 NotificationService 按通知规则分发到接收人。
 */
export async function dispatchBomEngineeringRoutingEvent(
  input: DispatchEbomEventInput
) {
  if (!isEBOM(input.bom)) {
    logger.warn('dispatchBomEngineeringRoutingEvent invoked with non-EBOM bom', {
      bomId: input.bom.id,
      bomType: input.bom.bomType,
    })
    return null
  }

  const event = buildBomEngineeringRoutingEvent(input)
  try {
    return await NotificationService.dispatch(event.type, event)
  } catch (error) {
    logger.warn('Failed to dispatch EBOM routing event', {
      semanticAction: input.semanticAction,
      bomId: input.bom.id,
      previousStatus: input.previousStatus,
      nextStatus: input.bom.status,
      error,
    })
    return null
  }
}

/**
 * 派发 MBOM (生产 BOM) 路由事件。
 *
 * MBOM 的状态机非常简单（EFFECTIVE / OBSOLETE），但事件类型多：
 * - 派生：CREATED_FROM_EBOM
 * - 工艺修订产生新版本：REVISED
 * - 关联 EBOM 在草稿/审核：MARKED_PENDING_REVISION / CLEARED_PENDING_REVISION
 * - 关联 EBOM 已升级未跟进：MARKED_STALE
 * - 作废：OBSOLETED
 */
export async function dispatchBomManufacturingRoutingEvent(
  input: DispatchMbomEventInput
) {
  if (!isMBOM(input.bom)) {
    logger.warn('dispatchBomManufacturingRoutingEvent invoked with non-MBOM bom', {
      bomId: input.bom.id,
      bomType: input.bom.bomType,
    })
    return null
  }

  const event = buildBomManufacturingRoutingEvent(input)
  try {
    return await NotificationService.dispatch(event.type, event)
  } catch (error) {
    logger.warn('Failed to dispatch MBOM routing event', {
      semanticAction: input.semanticAction,
      bomId: input.bom.id,
      bomStatus: input.bom.status,
      error,
    })
    return null
  }
}
