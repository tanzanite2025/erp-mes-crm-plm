export interface OutsourceInventoryCategoryOption {
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
