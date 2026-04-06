export type LogisticsInboundScanStage =
  | 'captured'
  | 'matched'
  | 'ready_to_submit'
  | 'duplicate'
  | 'submitted'
  | 'exception'

export interface LogisticsInboundHostContext {
  purchaseOrderId?: string
  orderNo?: string
  supplierName?: string
  shipmentId?: string
  carrier?: string
  contactPerson?: string
  contactPhone?: string
  warehouseId?: string
  warehouseName?: string
  operatorId?: string
  operatorName?: string
}

export interface LogisticsInboundScanSubject {
  trackingNo: string
  normalizedTrackingNo: string
  inferredCarrier?: string
  symbology?: string
  scannedAt: string
}

export interface LogisticsInboundRecordRef {
  logisticsRecordId?: string
  purchaseOrderId?: string
  purchaseOrderNo?: string
  supplierName?: string
  shipmentId?: string
  status?: string
}

export interface LogisticsInboundDraftPatch {
  trackingNo: string
  carrier?: string
  purchaseOrderId?: string
  orderNo?: string
  shipmentId?: string
  contactPerson?: string
  contactPhone?: string
}

export interface LogisticsInboundScanPayload {
  stage: LogisticsInboundScanStage
  summary: string
  subject: LogisticsInboundScanSubject
  hostContext: LogisticsInboundHostContext
  matchedRecord?: LogisticsInboundRecordRef
  draftPatch: LogisticsInboundDraftPatch
  warnings: string[]
}
