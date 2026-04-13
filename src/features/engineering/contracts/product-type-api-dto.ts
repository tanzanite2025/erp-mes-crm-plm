import { type DeltaPayload } from '@/lib/delta/types'

export interface ProductTypeApiDTO {
  id: string
  parentId?: string | null
  templateId?: string | null
  name: string
  code: string
  description?: string
  active: boolean
  sortOrder: number
  createdAt?: string
  updatedAt?: string
  _v?: number
  children?: ProductTypeApiDTO[]
}

export interface ProductTypeListPageApiDTO {
  items: ProductTypeApiDTO[]
  total: number
  page: number
  pageSize: number
}

export interface ProductTypeTemplateResolutionApiDTO {
  resolvedTemplateId?: string
  resolvedTemplateKey?: string
  templateResolutionSource?: string
  templateResolutionError?: string
}

export type PatchProductTypeApiDTO = DeltaPayload
