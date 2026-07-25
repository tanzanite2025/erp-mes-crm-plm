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
  notes?: string
  version?: number
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
