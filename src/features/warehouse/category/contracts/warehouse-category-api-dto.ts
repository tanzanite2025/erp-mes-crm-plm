export interface WarehouseCategoryApiDTO {
  id: string
  createdAt?: string
  updatedAt?: string
  version: number
  name: string
  code: string
  description?: string
  isSystem: boolean
  active: boolean
  sortOrder: number
  allowInbound: boolean
  allowShipment: boolean
  allowStocktake: boolean
  allowPurchaseReceipt: boolean
  defaultForProductInbound: boolean
  defaultForMaterialInbound: boolean
  defaultForPurchaseReceipt: boolean
}

export interface WarehouseCategoryOptionApiDTO {
  value: string
  label: string
  code: string
  name: string
  active: boolean
  sortOrder: number
  allowInbound: boolean
  allowShipment: boolean
  allowStocktake: boolean
  allowPurchaseReceipt: boolean
  defaultForProductInbound: boolean
  defaultForMaterialInbound: boolean
  defaultForPurchaseReceipt: boolean
}

export interface WarehouseCategoryListPageApiDTO {
  items: WarehouseCategoryApiDTO[]
  total: number
  page: number
  pageSize: number
}
