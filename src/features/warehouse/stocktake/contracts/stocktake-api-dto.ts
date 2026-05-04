export type StocktakeTaskStatusApiDTO = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ADJUSTED'

export interface StocktakeTaskApiDTO {
  id: string
  createdAt: string
  updatedAt: string
  version?: number
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
