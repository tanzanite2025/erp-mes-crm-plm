import { apiFetch } from '@/lib/api-client'

export interface CutSizeInventoryRecord {
  id: string
  cutSizeUnitId: string
  cutSizeCode: string
  cutSizeName: string
  quantity: number
  unit: string
  location: string
  remarks: string
  createdAt: string
  updatedAt: string
}

export interface RecordCutSizeInventoryInput {
  cutSizeUnitId: string
  cutSizeCode: string
  cutSizeName: string
  quantity: number
  unit?: string
  location?: string
  remarks?: string
}

export interface RecordCutSizeInventoryResponse {
  inventory: CutSizeInventoryRecord
}

export const CutSizeInventoryService = {
  list(): Promise<CutSizeInventoryRecord[]> {
    return apiFetch<CutSizeInventoryRecord[]>('/cutting-operations/size-inventory')
  },

  record(input: RecordCutSizeInventoryInput): Promise<RecordCutSizeInventoryResponse> {
    return apiFetch<RecordCutSizeInventoryResponse>('/cutting-operations/size-inventory/records', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
}
