import { type DeltaPayload } from '@/lib/delta/types'

export interface ProductTypeAttributeBindingApiDTO {
  id: string
  productTypeId: string
  categoryKey: string
  sortOrder: number
  required: boolean
  active: boolean
  createdAt?: string
  updatedAt?: string
  version?: number
}

export type ProductTypeAttributeBindingPatchApiDTO = DeltaPayload
