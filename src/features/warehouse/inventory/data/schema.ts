import { z } from 'zod'

export interface InventoryRecord {
  id: string
  materialId: string
  onHand: number
  reserved: number
  availableQty: number
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

export const inboundTDOSchema = z.object({
  materialId: z.string().min(1),
  quantity: z.number().positive(),
  batchNo: z.string(),
  entryDate: z.string(),
  remarks: z.string(),
  targetCategory: z.string().min(1),
})

export type InboundTDO = z.infer<typeof inboundTDOSchema>

export const inboundRecordSchema = z.object({
  id: z.string(),
  materialId: z.string(),
  materialName: z.string(),
  materialCode: z.string(),
  purchaseOrderId: z.string().optional(),
  purchaseOrderLineId: z.number().optional(),
  quantity: z.number(),
  purchasePrice: z.number(),
  batchNo: z.string(),
  entryDate: z.string(),
  operator: z.string(),
  remarks: z.string(),
  targetCategory: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type InboundRecord = z.infer<typeof inboundRecordSchema>

export interface InventoryAlertSummary {
  alertCount: number
}
