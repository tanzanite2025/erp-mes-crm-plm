export interface OutsourceOrderLineApiDTO {
  id?: string
  createdAt?: string
  updatedAt?: string
  outsourceOrderId?: string
  lineNo?: number
  sourceLineId?: string
  productId?: string
  productCode?: string
  productName?: string
  specification?: string
  quantity?: number
  uom?: string
  segmentId?: string
  segmentName?: string
  processStepId?: string
  processCode?: string
  processName?: string
  status?: string
  sentQuantity?: number
  returnedQuantity?: number
  acceptedQuantity?: number
  rejectedQuantity?: number
  reworkQuantity?: number
  scrapQuantity?: number
  notes?: string
  version?: number
}

export interface OutsourceTransferApiDTO {
  id?: string
  createdAt?: string
  updatedAt?: string
  transferNo?: string
  outsourceOrderId?: string
  outsourceOrderLineId?: string
  transferType?: string
  productBarcode?: string
  quantity?: number
  uom?: string
  partnerId?: string
  routeId?: string
  routeStepId?: string
  processStepId?: string
  fromHolderType?: string
  fromHolderId?: string
  toHolderType?: string
  toHolderId?: string
  sourceCategory?: string
  targetCategory?: string
  batchNo?: string
  transferEventId?: string
  occurredAt?: string
  operator?: string
  notes?: string
}

export interface OutsourceInspectionApiDTO {
  id?: string
  createdAt?: string
  updatedAt?: string
  inspectionNo?: string
  outsourceOrderId?: string
  outsourceOrderLineId?: string
  productBarcode?: string
  inspectionTaskId?: string
  result?: string
  disposition?: string
  inspectedQuantity?: number
  acceptedQuantity?: number
  rejectedQuantity?: number
  reworkQuantity?: number
  scrapQuantity?: number
  uom?: string
  routeId?: string
  routeStepId?: string
  processStepId?: string
  operationId?: string
  inspectedAt?: string
  inspector?: string
  notes?: string
}

export interface OutsourceOrderApiDTO {
  id?: string
  createdAt?: string
  updatedAt?: string
  orderNo?: string
  sourceType?: string
  sourceId?: string
  sourceNo?: string
  customerId?: string
  customerName?: string
  partnerId?: string
  partnerNameSnapshot?: string
  status?: string
  plannedSendDate?: string
  plannedReturnDate?: string
  totalQuantity?: number
  uom?: string
  notes?: string
  operator?: string
  version?: number
  lines?: OutsourceOrderLineApiDTO[]
}

export interface OutsourceTransferActionApiResponseDTO {
  order?: OutsourceOrderApiDTO
  transfer?: OutsourceTransferApiDTO
}

export interface OutsourceInspectionActionApiResponseDTO {
  order?: OutsourceOrderApiDTO
  inspection?: OutsourceInspectionApiDTO
}

export interface OutsourceDiagnosticsIssueApiDTO {
  id?: string
  severity?: string
  type?: string
  orderId?: string
  orderNo?: string
  lineId?: string
  lineNo?: number
  productBarcode?: string
  message?: string
  quantityDiff?: number
  metadata?: Record<string, string>
}

export interface OutsourceDiagnosticsApiResponseDTO {
  generatedAt?: string
  summary?: {
    openOrders?: number
    activeLines?: number
    pendingReturnQuantity?: number
    pendingInspectionQuantity?: number
    transferFacts?: number
    inspectionFacts?: number
    notificationFailed?: number
    reconciliationIssues?: number
    criticalIssues?: number
    warningIssues?: number
    infoIssues?: number
    totalIssues?: number
    issuesTruncated?: boolean
  }
  issues?: OutsourceDiagnosticsIssueApiDTO[]
}

export interface OutsourceOrderListApiResponseDTO {
  items?: OutsourceOrderApiDTO[]
  metadata?: {
    total?: number
    draft?: number
    released?: number
    active?: number
    returned?: number
    closed?: number
    canceled?: number
    salesOrder?: number
    production?: number
  }
}
