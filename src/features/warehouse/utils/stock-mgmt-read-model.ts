import type { WarehouseCategory } from '../category/services/warehouse-category-core-service'
import type { InventoryThresholdRule } from '../material-thresholds/data/schema'
import { buildMaterialThresholdMap } from '../material-thresholds/services/material-threshold-helpers'
import type { InventoryAlertSummary, InventoryView } from '../inventory'

export interface StockMgmtReadyData {
  groupedInventory: Record<string, InventoryView[]>
  materialTotalStock: Record<string, number>
  totalAssetsValue: number
  materialThresholdMap: Record<string, number>
  thresholdRules: InventoryThresholdRule[]
  categories: WarehouseCategory[]
  alertCount: number
  materialAlertCount: number
  bomAlertCount: number
}

export function buildStockMgmtReadyData(params: {
  inventory: InventoryView[]
  thresholdRules: InventoryThresholdRule[]
  categories: WarehouseCategory[]
  alertSummary: InventoryAlertSummary
  totalAssetsValue: number
  searchTerm: string
}): StockMgmtReadyData {
  const { inventory, thresholdRules, categories, alertSummary, totalAssetsValue, searchTerm } = params
  const materialThresholdMap = buildMaterialThresholdMap(thresholdRules)
  const materialTotalStock = inventory.reduce<Record<string, number>>((totals, item) => {
    totals[item.materialId] = (totals[item.materialId] || 0) + item.quantity
    return totals
  }, {})

  const normalizedSearchTerm = searchTerm.toLowerCase()
  const filteredInventory = inventory.filter((item) =>
    item.materialName.toLowerCase().includes(normalizedSearchTerm) ||
    item.materialCode.toLowerCase().includes(normalizedSearchTerm)
  )

  const groupedInventory = categories.reduce<Record<string, InventoryView[]>>((groups, category) => {
    groups[category.code] = []
    return groups
  }, {})

  filteredInventory.forEach((item) => {
    let categoryCode = (item.categoryCode || 'MATERIAL').trim()
    if (!categories.some((category) => category.code === categoryCode)) {
      categoryCode = 'MATERIAL'
    }
    if (!groupedInventory[categoryCode]) {
      groupedInventory[categoryCode] = []
    }
    groupedInventory[categoryCode].push(item)
  })

  return {
    groupedInventory,
    materialTotalStock,
    totalAssetsValue,
    materialThresholdMap,
    thresholdRules,
    categories,
    alertCount: alertSummary.alertCount,
    materialAlertCount: alertSummary.materialAlertCount,
    bomAlertCount: alertSummary.bomAlertCount,
  }
}
