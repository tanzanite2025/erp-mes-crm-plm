export type MaterialChangeTypeApiDTO = 'MANUAL' | 'ECO' | 'ECN'
export type MaterialStatusApiDTO = 'Active' | 'Inactive' | 'Archived'

export interface MaterialDimensionsApiDTO {
  length: number
  width: number
  height: number
  unit: string
}

export interface MaterialApiDTO {
  id: string
  code: string
  name: string
  category: string
  spec?: string
  internalDimensions?: MaterialDimensionsApiDTO | null
  externalDimensions?: MaterialDimensionsApiDTO | null
  uom: string
  minStock: number
  costPrice?: number
  supplierId?: string
  description?: string
  images?: string[]
  status: MaterialStatusApiDTO
  revisionNo?: string
  effectiveFrom?: string | null
  effectiveTo?: string | null
  changeType?: MaterialChangeTypeApiDTO
  changeOrderNo?: string
  siteCode?: string
  isDefaultSite?: boolean
  createdAt?: string
  updatedAt?: string
  version?: number
}

export interface MaterialOptionApiDTO {
  id: string
  code: string
  name: string
  spec?: string
  uom?: string
  category?: string
  status?: MaterialStatusApiDTO
  costPrice?: number
}

export interface MaterialOptionsResponseApiDTO {
  items: MaterialOptionApiDTO[]
  version: string
}

export interface MaterialListPageApiDTO {
  items: MaterialApiDTO[]
  total: number
  page: number
  pageSize: number
  version: string
}

export interface SaveMaterialApiDTO {
  id?: string
  code: string
  name: string
  category: string
  spec?: string
  internalDimensions?: MaterialDimensionsApiDTO
  externalDimensions?: MaterialDimensionsApiDTO
  uom: string
  minStock: number
  costPrice?: number
  supplierId?: string
  description?: string
  images?: string[]
  status: MaterialStatusApiDTO
  revisionNo?: string
  effectiveFrom?: string | null
  effectiveTo?: string | null
  changeType?: MaterialChangeTypeApiDTO
  changeOrderNo?: string
  siteCode?: string
  isDefaultSite?: boolean
  version?: number
}

export interface BulkSyncMaterialsApiDTO {
  materials: SaveMaterialApiDTO[]
  globalVersion?: number
}
