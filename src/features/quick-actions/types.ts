import type { LucideIcon } from 'lucide-react'

export type QuickActionScanMode = 'scan'

export interface QuickActionDefinition {
  id: 'warehouse_inbound_scan' | 'warehouse_shipment_scan' | 'warehouse_stocktake_scan'
  title: string
  description: string
  icon: LucideIcon
  to: '/warehouse/inbound' | '/warehouse/shipment' | '/warehouse/stocktake'
  search: {
    mode: QuickActionScanMode
  }
  requiredPermissions: string[]
  enabled: boolean
  sortOrder: number
}
