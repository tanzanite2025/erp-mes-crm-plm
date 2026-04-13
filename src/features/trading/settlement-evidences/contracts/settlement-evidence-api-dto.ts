export interface SettlementEvidenceAssetApiDTO {
  id: string
  fileName: string
  fileUrl: string
  mimeType: string
  fileSize: number
  category: string
  uploadedBy: string
  createdAt: string
  updatedAt: string
}

export interface SettlementRecordEvidenceApiDTO {
  id: string
  recordType: string
  recordId: string
  assetId: string
  sortOrder: number
  note: string
  isPrimary: boolean
  createdAt: string
  updatedAt: string
  asset: SettlementEvidenceAssetApiDTO
}

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
