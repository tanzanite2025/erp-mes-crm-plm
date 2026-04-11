export type LogisticsStatusApiDTO = 'Pending' | 'InTransit' | 'Delivered' | 'Exception' | 'Canceled'

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
  events?: LogisticsEventApiDTO[] | string | null
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
