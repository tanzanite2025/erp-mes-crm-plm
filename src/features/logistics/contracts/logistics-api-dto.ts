export type LogisticsStatusApiDTO =
  | 'Pending'
  | 'InTransit'
  | 'Delivered'
  | 'Exception'
  | 'Canceled'

export type LogisticsTypeApiDTO = 'Shipment' | 'Receipt'

export interface LogisticsEventApiDTO {
  id?: string
  time: string
  location?: string
  description?: string
  status: LogisticsStatusApiDTO
}

export interface LogisticsRecordApiDTO {
  id: string
  orderNo: string
  salesOrderId?: string
  purchaseOrderId?: string
  productId?: string
  shipmentId?: string
  type: LogisticsTypeApiDTO
  carrier: string
  trackingNo: string
  status: LogisticsStatusApiDTO
  lastLocation?: string
  contactPerson?: string
  contactPhone?: string
  events?: LogisticsEventApiDTO[] | null
  version?: number
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
}

export interface LogisticsListPageApiDTO {
  items: LogisticsRecordApiDTO[]
  total: number
  page: number
  pageSize: number
}

export interface SaveLogisticsRecordApiDTO {
  id?: string
  orderNo: string
  salesOrderId?: string
  purchaseOrderId?: string
  productId?: string
  shipmentId?: string
  type: LogisticsTypeApiDTO
  carrier: string
  trackingNo: string
  status: LogisticsStatusApiDTO
  lastLocation?: string
  contactPerson?: string
  contactPhone?: string
  events: LogisticsEventApiDTO[]
  version?: number
  isDeleted?: boolean
}

export interface UpdateLogisticsStatusApiDTO {
  status: LogisticsStatusApiDTO
  location: string
  description: string
  events: LogisticsEventApiDTO[]
  version: number
}

export interface ControlledTrackingOrderApiDTO {
  id: number
  createdAt: string
  updatedAt: string
  bizOrderNo: string
  bizType: string
  carrierCode: string
  carrierName: string
  trackingNo: string
  status: string
  subscribedAt?: string | null
  lastPushAt?: string | null
  lastLocation?: string
  lastEvent?: string
  signedAt?: string | null
  version?: number
}

export interface ControlledTrackingTraceApiDTO {
  id?: number
  createdAt?: string
  deliveryOrderId?: number
  time: string
  context?: string
  location?: string
  hashKey?: string
}

export interface LogisticsTrackingRefreshResultApiDTO {
  status?: string
  message?: string
  action?: string
  providerCode?: string
  insertedTraces?: number
  checkedAt?: string
}

export interface ControlledTrackingDetailApiDTO {
  order: ControlledTrackingOrderApiDTO
  traces: ControlledTrackingTraceApiDTO[]
  refresh?: LogisticsTrackingRefreshResultApiDTO | null
}
