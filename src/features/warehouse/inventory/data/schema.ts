export interface InventoryRecord {
  id: string
  materialId: string
  quantity: number
  totalValue: number
  averageUnitCost: number
  categoryCode: string
  lastUpdated: string
  version: number
}

export interface InventoryView extends InventoryRecord {
  materialName: string
  materialCode: string
  materialCategory: string
  materialSpec: string
  batchNo: string
  uom: string
  createdAt?: string
  updatedAt?: string
}

export interface MasterDataSearchResult {
  id: string
  name: string
  code: string
  spec: string
  uom: string
  category: string
  sourceModule: 'MATERIAL' | 'PRODUCT'
  stock: number
}

export interface InboundRecord {
  id: string
  materialId: string
  materialName: string
  materialCode: string
  purchaseOrderId?: string
  purchaseOrderLineId?: number
  quantity: number
  purchasePrice: number
  batchNo: string
  entryDate: string
  operator: string
  remarks: string
  targetCategory: string
  createdAt?: string
  updatedAt?: string
}

export interface InventoryAlertSummary {
  alertCount: number
}
