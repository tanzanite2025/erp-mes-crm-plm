import { z } from 'zod'
import {
  entityCreatedBySchema,
  entityIdentitySchema,
  entityVersionSchema,
} from '@/lib/schema/base-entity-schema'

export const stocktakeTaskStatusSchema = z.enum([
  'DRAFT',
  'IN_PROGRESS',
  'COMPLETED',
  'ADJUSTED',
])

export const stocktakeTaskSchema = entityIdentitySchema
  .merge(entityCreatedBySchema)
  .merge(entityVersionSchema)
  .extend({
    title: z.string().min(1, '请输入盘点标题'),
    warehouseCategoryCode: z.string().min(1, '请选择库区'),
    status: stocktakeTaskStatusSchema.default('DRAFT'),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    remarks: z.string().optional(),
    createdAt: z.string(),
  })

export const stocktakeItemSchema = entityIdentitySchema
  .merge(entityVersionSchema)
  .extend({
    taskId: z.string(),
    materialId: z.string(),
    materialCode: z.string(),
    materialName: z.string(),
    batchNo: z.string(),
    binCode: z.string().optional(), // 库位
    theoryQty: z.number(), // 账面数
    actualQty: z.number(), // 实盘数
    difference: z.number(), // 差异
    uom: z.string(),
    scannerId: z.string().optional(),
    scanTime: z.string().optional(),
  })

export type StocktakeTask = z.infer<typeof stocktakeTaskSchema>
export type StocktakeItem = z.infer<typeof stocktakeItemSchema>
export type StocktakeTaskStatus = z.infer<typeof stocktakeTaskStatusSchema>
