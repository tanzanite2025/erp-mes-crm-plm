export interface WarehouseCategory {
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

export interface WarehouseCategoryOption {
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
