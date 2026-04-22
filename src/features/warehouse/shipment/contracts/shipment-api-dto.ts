export interface InventoryShipmentRecordApiDTO {
  id: string
  materialId: string
  materialName: string
  materialCode: string
  salesOrderId?: string
  salesOrderLineId?: number
  quantity: number
  sourceCategory: string
  batchNo: string
  orderNo: string
  status: 'DRAFT' | 'COMMITTED' | 'VOID'
  cogs: number
  shipmentDate: string
  operator: string
  remarks: string
  createdAt?: string
  updatedAt?: string
  version: number
}

export interface ShipmentDemandStockBreakdownApiDTO {
  categoryCode: string
  batchNo: string
  quantity: number
}

export interface ShipmentDemandApiDTO {
  salesOrderId: string
  salesOrderLineId: number
  orderNo: string
  customerName: string
  deliveryDate: string
  materialId: string
  materialName: string
  materialCode: string
  materialSpec: string
  uom: string
  orderedQty: number
  deliveredQty: number
  virtualReadyQty: number
  remainingToPrepare: number
  availableQty: number
  stockBreakdown: ShipmentDemandStockBreakdownApiDTO[]
}

export interface ShipmentDemandListApiDTO {
  items: ShipmentDemandApiDTO[]
  total: number
}
