import { z } from 'zod'

export const packagingAssemblyItemSchema = z.object({
  id: z.string(),
  productBarcode: z.string(),
  productBarcodeBindingId: z.string(),
  barcodeProtocol: z.string(),
  barcodeSummary: z.string(),
  sortOrder: z.number(),
})

export const packagingAssemblySchema = z.object({
  id: z.string(),
  packageCode: z.string(),
  status: z.string(),
  itemCount: z.number(),
  source: z.string(),
  sessionId: z.string(),
  assembledBy: z.string(),
  assembledAt: z.string().optional(),
  createdAt: z.string(),
  items: z.array(packagingAssemblyItemSchema),
})

export const packagingAssemblyListResultSchema = z.object({
  items: z.array(packagingAssemblySchema),
  total: z.number(),
})

export const packagingAssemblyCaptureStatusSchema = z.enum([
  'Waiting',
  'Submitted',
  'Expired',
])

export const packagingAssemblyCaptureSessionSchema = z.object({
  sessionId: z.string(),
  uploadToken: z.string().optional(),
  status: packagingAssemblyCaptureStatusSchema,
  packageCode: z.string(),
  assemblyId: z.string(),
  assembly: packagingAssemblySchema.optional(),
  submittedAt: z.string().optional(),
  expiresAt: z.string(),
})

export const submitPackagingAssemblyCaptureSessionInputSchema = z.object({
  token: z.string().min(1),
  productBarcodes: z.array(z.string().min(1)),
})

export type PackagingAssemblyCaptureStatus = z.infer<
  typeof packagingAssemblyCaptureStatusSchema
>
export type PackagingAssemblyItem = z.infer<typeof packagingAssemblyItemSchema>
export type PackagingAssembly = z.infer<typeof packagingAssemblySchema>
export type PackagingAssemblyListResult = z.infer<
  typeof packagingAssemblyListResultSchema
>
export type PackagingAssemblyCaptureSession = z.infer<
  typeof packagingAssemblyCaptureSessionSchema
>
export type SubmitPackagingAssemblyCaptureSessionInput = z.infer<
  typeof submitPackagingAssemblyCaptureSessionInputSchema
>
