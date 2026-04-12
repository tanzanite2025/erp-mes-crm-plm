export interface InventoryItemApiDTO {
  id: string
  createdAt?: string
  updatedAt?: string
  lastUpdated?: string
  materialId: string
  materialName: string
  materialCode: string
  materialCategory: string
  materialSpec: string
  onHand: number
  reserved: number
  availableQty: number
  quantity: number
  totalValue: number
  averageUnitCost: number
  categoryCode: string
  batchNo: string
  uom: string
  version: number
}

export interface InventoryListPageApiDTO {
  items: InventoryItemApiDTO[]
  total: number
  page: number
  pageSize: number
}

export interface MasterDataSearchResultApiDTO {
  id: string
  name: string
  code: string
  spec: string
  uom: string
  category: string
  sourceModule: 'MATERIAL' | 'PRODUCT'
  stock: number
}

export interface CreateInventoryInboundApiDTO {
  materialId: string
  quantity: number
  targetCategory: string
  batchNo: string
  inboundDate: string
  remarks: string
}

export interface InventoryInboundRecordApiDTO {
  id: string
  materialId: string
  materialName: string
  materialCode: string
  purchaseOrderId?: string
  purchaseOrderLineId?: number
  quantity: number
  purchasePrice: number
  targetCategory: string
  batchNo: string
  inboundDate: string
  operator: string
  remarks: string
  createdAt?: string
  updatedAt?: string
}

export interface InventoryInboundHistoryApiDTO {
  items: InventoryInboundRecordApiDTO[]
  total: number
  page: number
  pageSize: number
}

export interface InventoryValuationApiDTO {
  totalValue: number
}

export interface InventoryAlertSummaryApiDTO {
  alertCount: number
}
