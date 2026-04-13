import type { PersonalWorkbenchColumnKey } from './constants'

export interface PersonalRecordAsset {
  id: string
  recordId: string
  ownerUserId: string
  storagePath: string
  mimeType: string
  width: number
  height: number
  sizeBytes: number
  createdAt: string
}

export interface PersonalRecord {
  id: string
  ownerUserId: string
  title: string
  note: string
  columnKey: PersonalWorkbenchColumnKey
  sortOrder: number
  coverImageUrl: string
  archivedAt?: string
  createdAt: string
  updatedAt: string
  assets: PersonalRecordAsset[]
}

export interface PersonalRecordListResponse {
  items: PersonalRecord[]
  total: number
}

export interface PersonalRecordUpsertPayload {
  title: string
  note: string
  columnKey: PersonalWorkbenchColumnKey
  sortOrder: number
  coverImageUrl: string
  assets: Array<{
    storagePath: string
    mimeType: string
    width: number
    height: number
    sizeBytes: number
  }>
}

export interface PersonalRecordReorderPayloadItem {
  id: string
  columnKey: PersonalWorkbenchColumnKey
  sortOrder: number
}
