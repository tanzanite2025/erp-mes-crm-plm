import type { LucideIcon } from 'lucide-react'

export type QuickActionScanMode = 'scan'
export type QuickActionTranslationKey =
  | 'quickActions.actions.warehouseInboundScan.title'
  | 'quickActions.actions.warehouseInboundScan.description'
  | 'quickActions.actions.warehouseShipmentScan.title'
  | 'quickActions.actions.warehouseShipmentScan.description'
  | 'quickActions.actions.warehouseStocktakeScan.title'
  | 'quickActions.actions.warehouseStocktakeScan.description'

export interface QuickActionDefinition {
  id: 'warehouse_inbound_scan' | 'warehouse_shipment_scan' | 'warehouse_stocktake_scan'
  titleKey: QuickActionTranslationKey
  descriptionKey: QuickActionTranslationKey
  icon: LucideIcon
  to: '/warehouse/inbound' | '/warehouse/shipment' | '/warehouse/stocktake'
  search: {
    mode: QuickActionScanMode
  }
  requiredPermissions: string[]
  enabled: boolean
  sortOrder: number
}
