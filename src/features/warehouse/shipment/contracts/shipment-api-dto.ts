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
