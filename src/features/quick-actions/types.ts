import type { LucideIcon } from 'lucide-react'

export type QuickActionScanMode = 'scan' | 'photo' | 'video'
export type QuickActionTranslationKey =
  | 'quickActions.actions.wheelTraceScan.title'
  | 'quickActions.actions.wheelTraceScan.description'
  | 'quickActions.actions.warehouseInboundScan.title'
  | 'quickActions.actions.warehouseInboundScan.description'
  | 'quickActions.actions.warehouseShipmentScan.title'
  | 'quickActions.actions.warehouseShipmentScan.description'
  | 'quickActions.actions.warehouseStocktakeScan.title'
  | 'quickActions.actions.warehouseStocktakeScan.description'
  | 'quickActions.actions.personalWorkbenchPhoto.title'
  | 'quickActions.actions.personalWorkbenchPhoto.description'
  | 'quickActions.actions.personalWorkbenchVideo.title'
  | 'quickActions.actions.personalWorkbenchVideo.description'
  | 'quickActions.actions.personalWorkbenchBuffer.title'
  | 'quickActions.actions.personalWorkbenchBuffer.description'

export interface QuickActionDefinition {
  id:
    | 'wheel_trace_scan'
    | 'warehouse_inbound_scan'
    | 'warehouse_shipment_scan'
    | 'warehouse_stocktake_scan'
    | 'personal_workbench_photo'
    | 'personal_workbench_video'
    | 'personal_workbench_buffer'
  titleKey: QuickActionTranslationKey
  descriptionKey: QuickActionTranslationKey
  icon: LucideIcon
  to:
    | '/wheel-trace'
    | '/warehouse/inbound'
    | '/warehouse/shipment'
    | '/warehouse/stocktake'
    | '/personal-workbench'
    | '/personal-workbench/capture'
  search: {
    mode?: QuickActionScanMode
    scan?: string
  }
  permissionPath?: string
  requiredPermissions: string[]
  enabled: boolean
  sortOrder: number
}

export interface SidebarQuickActionView {
  id: string
  title?: string
  titleKey?: QuickActionTranslationKey
  iconName: string
  to: string
  search: Record<string, string>
  enabled: boolean
  sortOrder: number
  isPrivate: boolean
}
