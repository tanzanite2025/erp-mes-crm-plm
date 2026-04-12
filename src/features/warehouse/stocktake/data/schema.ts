import { z } from 'zod'

export type StocktakeTaskStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ADJUSTED'

export const stocktakeTaskSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  title: z.string(),
  warehouseCategoryCode: z.string(),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ADJUSTED']),
  createdBy: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  remarks: z.string().optional(),
})

export type StocktakeTask = z.infer<typeof stocktakeTaskSchema>

export const stocktakeItemSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  taskId: z.string(),
  materialId: z.string(),
  materialCode: z.string(),
  materialName: z.string(),
  batchNo: z.string(),
  theoryQty: z.number(),
  actualQty: z.number(),
  difference: z.number(),
  uom: z.string(),
  scannerId: z.string().optional(),
  scanTime: z.string().optional(),
  version: z.number(),
})

export type StocktakeItem = z.infer<typeof stocktakeItemSchema>

export const stocktakeTaskArraySchema = z.array(stocktakeTaskSchema)

export const stocktakeItemArraySchema = z.array(stocktakeItemSchema)

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
