import { type WarehouseCategoryOption } from '../services/warehouse-category-core-service'

export type WarehouseCategoryScene =
  | 'product-inbound'
  | 'material-inbound'
  | 'shipment'
  | 'stocktake'
  | 'purchase-receipt'

export function isWarehouseCategoryAllowedForScene(
  category: WarehouseCategoryOption,
  scene: WarehouseCategoryScene,
) {
  switch (scene) {
    case 'product-inbound':
    case 'material-inbound':
      return category.allowInbound
    case 'shipment':
      return category.allowShipment
    case 'stocktake':
      return category.allowStocktake
    case 'purchase-receipt':
      return category.allowPurchaseReceipt
    default:
      return true
  }
}

export function filterWarehouseCategoriesByScene(
  categories: WarehouseCategoryOption[],
  scene: WarehouseCategoryScene,
) {
  return categories.filter((category) => isWarehouseCategoryAllowedForScene(category, scene))
}

export function getDefaultWarehouseCategoryCode(
  categories: WarehouseCategoryOption[],
  scene: WarehouseCategoryScene,
  preferredCode?: string,
) {
  const allowed = filterWarehouseCategoriesByScene(categories, scene)
  if (allowed.length === 0) return ''

  if (preferredCode && allowed.some((category) => category.code === preferredCode)) {
    return preferredCode
  }

  const preferredDefault = allowed.find((category) => {
    switch (scene) {
      case 'product-inbound':
        return category.defaultForProductInbound
      case 'material-inbound':
        return category.defaultForMaterialInbound
      case 'purchase-receipt':
        return category.defaultForPurchaseReceipt
      default:
        return false
    }
  })

  return preferredDefault?.code || allowed[0]?.code || ''
}
