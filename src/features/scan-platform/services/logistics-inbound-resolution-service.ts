import { normalizeTrackingCode } from '@/lib/codecs/code-normalization'
import type { ScanResolveInput, ScanResolvedContext } from '../core/types'
import type {
  LogisticsInboundHostContext,
  LogisticsInboundScanPayload,
} from '../models/logistics-inbound'

export const logisticsInboundResolutionService = {
  async resolve(
    input: ScanResolveInput<LogisticsInboundHostContext>
  ): Promise<ScanResolvedContext<LogisticsInboundScanPayload>> {
    const normalizedTrackingNo = normalizeTrackingCode(input.rawCode)
    const hostContext = input.context
    if (!hostContext) {
      // 物流进货解析必须具备宿主上下文（采购单信息等），否则将导致采集流程中断或数据孤立
      throw new Error(
        `[CRITICAL] Logistics scanning requires host context (Purchase Order info) but received null/undefined`
      )
    }
    const inferredCarrier = hostContext.carrier || undefined

    return {
      rawCode: normalizedTrackingNo,
      mode: 'submit',
      payload: {
        stage: hostContext.purchaseOrderId ? 'ready_to_submit' : 'captured',
        summary: hostContext.purchaseOrderId
          ? `已采集物流单号，可直接提交到进货物流流程: ${normalizedTrackingNo}`
          : `已采集物流单号，待补充采购单上下文: ${normalizedTrackingNo}`,
        subject: {
          trackingNo: input.rawCode,
          normalizedTrackingNo,
          inferredCarrier,
          symbology: 'code128',
          scannedAt: new Date().toISOString(),
        },
        hostContext,
        matchedRecord: hostContext.purchaseOrderId
          ? {
              purchaseOrderId: hostContext.purchaseOrderId,
              purchaseOrderNo: hostContext.orderNo,
              shipmentId: hostContext.shipmentId,
              supplierName: hostContext.supplierName,
              status: 'Pending',
            }
          : undefined,
        draftPatch: {
          trackingNo: normalizedTrackingNo,
          carrier: inferredCarrier,
          purchaseOrderId: hostContext.purchaseOrderId,
          orderNo: hostContext.orderNo,
          shipmentId: hostContext.shipmentId,
          contactPerson: hostContext.contactPerson,
          contactPhone: hostContext.contactPhone,
        },
        warnings: hostContext.purchaseOrderId
          ? []
          : ['当前仅完成物流单号采集，采购单与供应商上下文仍需宿主页面提供。'],
      },
    }
  },
}
