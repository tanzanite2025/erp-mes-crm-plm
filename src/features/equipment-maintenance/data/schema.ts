import { z } from 'zod'

export const maintenanceRecordTypeSchema = z.enum([
  'PREVENTIVE',
  'CORRECTIVE',
  'INSPECTION',
])
export const maintenanceRecordStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
])
export const maintenanceRecordPrioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
])

export const maintenanceRecordSchema = z.object({
  id: z.string(),
  assetType: z.enum(['MOLD', 'FURNACE']),
  assetId: z.string(),
  assetSn: z.string(),
  type: maintenanceRecordTypeSchema,
  status: maintenanceRecordStatusSchema,
  title: z.string().min(1),
  description: z.string().optional(),
  priority: maintenanceRecordPrioritySchema,
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  cost: z.number().min(0).default(0),
  remarks: z.string().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  version: z.number().default(1),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
})

export type MaintenanceRecord = z.infer<typeof maintenanceRecordSchema>
export type MaintenanceRecordType = z.infer<typeof maintenanceRecordTypeSchema>
export type MaintenanceRecordStatus = z.infer<
  typeof maintenanceRecordStatusSchema
>
export type MaintenanceRecordPriority = z.infer<
  typeof maintenanceRecordPrioritySchema
>
