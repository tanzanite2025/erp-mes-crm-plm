export type StocktakeTaskStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ADJUSTED'

export interface StocktakeTask {
  id: string
  createdAt: string
  updatedAt: string
  title: string
  warehouseCategoryCode: string
  status: StocktakeTaskStatus
  createdBy: string
  startTime?: string
  endTime?: string
  remarks?: string
}

export interface StocktakeItem {
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
  scanTime?: string
  version: number
}

export interface StocktakeCreateInput {
  title: string
  warehouseCategoryCode: string
  remarks?: string
}

export interface PDAScanPayload {
  taskId: string
  materialCode: string
  batchNo: string
  scannedQty: number
  scanTime?: string
  scannerId?: string
}

export interface PDABulkSyncFailure {
  index: number
  taskId: string
  materialCode: string
  batchNo: string
  scannedQty: number
  error: string
}

export interface PDABulkSyncResponse {
  count: number
  successCount: number
  failedCount: number
  failures: PDABulkSyncFailure[]
  message: string
}

export interface WarehouseCommandAck {
  message: string
}
