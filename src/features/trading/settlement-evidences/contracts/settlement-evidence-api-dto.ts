import { z } from 'zod'

export const settlementEvidenceAssetApiDTOSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileUrl: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  category: z.string(),
  uploadedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict()

export const settlementRecordEvidenceApiDTOSchema = z.object({
  id: z.string(),
  recordType: z.string(),
  recordId: z.string(),
  assetId: z.string(),
  sortOrder: z.number(),
  note: z.string(),
  isPrimary: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  asset: settlementEvidenceAssetApiDTOSchema,
}).strict()

export type SettlementEvidenceAssetApiDTO = z.infer<typeof settlementEvidenceAssetApiDTOSchema>
export type SettlementRecordEvidenceApiDTO = z.infer<typeof settlementRecordEvidenceApiDTOSchema>

export interface CreateSettlementRecordEvidenceApiDTO {
  fileName: string
  fileUrl: string
  mimeType?: string
  fileSize?: number
  category?: string
  sortOrder?: number
  note?: string
  isPrimary?: boolean
}

export interface UploadedSettlementEvidenceImageApiDTO {
  id: string
  url: string
  name: string
  uploadedAt: string
  isDuplicate: boolean
}
