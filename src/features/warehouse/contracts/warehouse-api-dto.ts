export interface WarehouseCategoryApiDTO {
  id: string
  createdAt?: string
  updatedAt?: string
  version: number
  name: string
  code: string
  description?: string
  isSystem: boolean
  active: boolean
  sortOrder: number
  allowInbound: boolean
  allowShipment: boolean
  allowStocktake: boolean
  allowPurchaseReceipt: boolean
  defaultForProductInbound: boolean
  defaultForMaterialInbound: boolean
  defaultForPurchaseReceipt: boolean
}

export interface WarehouseCategoryOptionApiDTO {
  value: string
  label: string
  code: string
  name: string
  active: boolean
  sortOrder: number
  allowInbound: boolean
  allowShipment: boolean
  allowStocktake: boolean
  allowPurchaseReceipt: boolean
  defaultForProductInbound: boolean
  defaultForMaterialInbound: boolean
  defaultForPurchaseReceipt: boolean
}

export interface WarehouseCategoryListPageApiDTO {
  items: WarehouseCategoryApiDTO[]
  total: number
  page: number
  pageSize: number
}

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

export interface InventoryShipmentHistoryApiDTO {
  items: InventoryShipmentRecordApiDTO[]
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

export type StocktakeTaskStatusApiDTO =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ADJUSTED'

export interface StocktakeTaskApiDTO {
  id: string
  createdAt: string
  updatedAt: string
  title: string
  warehouseCategoryCode: string
  status: StocktakeTaskStatusApiDTO
  createdBy: string
  startTime?: string | null
  endTime?: string | null
  remarks?: string
}

export interface StocktakeItemApiDTO {
  id: string
  createdAt: string
  updatedAt: string
  taskId: string
  materialId: string
  materialCode: string
  materialName: string
  batchNo: string
  theoryQty: number
  actualQty: number
  difference: number
  uom: string
  scannerId?: string
  scanTime?: string | null
  version?: number
}

export interface WarehouseCommandAckApiDTO {
  message: string
}

export interface StocktakeCreateRequestApiDTO {
  title: string
  warehouseCategoryCode: string
  remarks?: string
}

export interface PDAScanPayloadApiDTO {
  taskId: string
  materialCode: string
  batchNo: string
  scannedQty: number
  scanTime?: string
  scannerId?: string
}

export interface PDABulkSyncFailureApiDTO {
  index: number
  taskId: string
  materialCode: string
  batchNo: string
  scannedQty: number
  error: string
}

export interface PDABulkSyncResponseApiDTO {
  count: number
  successCount: number
  failedCount: number
  failures: PDABulkSyncFailureApiDTO[]
  message: string
}

export type InventoryAdjustmentTypeApiDTO = 'STOCKTAKE' | 'MANUAL'

export type InventoryAdjustmentStatusApiDTO =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'

export interface InventoryAdjustmentItemApiDTO {
  id: string
  createdAt: string
  updatedAt: string
  adjustmentId: string
  materialId: string
  materialCode: string
  materialName: string
  categoryCode: string
  batchNo: string
  theoryQty: number
  actualQty: number
  diffQty: number
  uom: string
}

export interface InventoryAdjustmentApiDTO {
  id: string
  createdAt: string
  updatedAt: string
  taskId?: string
  adjustmentNo: string
  type: InventoryAdjustmentTypeApiDTO
  status: InventoryAdjustmentStatusApiDTO
  reason: string
  createdBy: string
  approvedBy?: string
  approvedAt?: string | null
  executedBy?: string
  executedAt?: string | null
  totalItems: number
  items?: InventoryAdjustmentItemApiDTO[]
}
