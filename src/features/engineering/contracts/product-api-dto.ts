import { type DeltaPayload } from '@/lib/delta/types'

export interface ProductAttributeValueApiDTO {
  id?: string
  productId?: string
  categoryKey: string
  optionValue: string
  sortOrder: number
  version: number
}

export interface ProductApiDTO {
  id: string
  sku: string
  name: string
  modelCode: string
  typeId: string
  depth?: number
  widthInternal?: number
  widthExternal?: number
  tireType?: string
  brakeType?: string
  techSeries?: string
  versionLevel?: string
  weight?: number
  length?: number
  angle?: number
  clamp?: string
  offset?: number
  axleCrown?: number
  steerer?: string
  image?: string
  restrictions?: string[]
  moldGroup?: string
  description?: string
  engineeringSpecId?: string
  attributeValues?: ProductAttributeValueApiDTO[]
  techSpecs?: unknown
  barcodeConfig?: unknown
  attachments?: unknown
  status?: 'Active' | 'Draft' | 'Archived'
  templateKey?: string
  revisionNo?: string
  effectiveFrom?: string | null
  effectiveTo?: string | null
  changeType?: 'MANUAL' | 'ECO' | 'ECN'
  changeOrderNo?: string
  siteCode?: string
  isDefaultSite?: boolean
  createdAt?: string
  updatedAt?: string
  _v?: number
}

export interface ProductListPageApiDTO {
  items: ProductApiDTO[]
  total: number
  page: number
  pageSize: number
}

export interface ProductNextCodeApiDTO {
  nextCode: string
}

export interface BulkSyncProductsApiDTO {
  products: ProductApiDTO[]
  globalVersion?: number
}

export type PatchProductApiDTO = DeltaPayload
