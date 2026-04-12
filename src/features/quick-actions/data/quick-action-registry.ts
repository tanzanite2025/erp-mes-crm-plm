import { ClipboardCheck, PackagePlus, ScanLine } from 'lucide-react'
import type { QuickActionDefinition } from '../types'

const quickActionRegistryEntries = [
  {
    id: 'warehouse_inbound_scan',
    titleKey: 'quickActions.actions.warehouseInboundScan.title',
    descriptionKey: 'quickActions.actions.warehouseInboundScan.description',
    icon: PackagePlus,
    to: '/warehouse/inbound',
    search: { mode: 'scan' },
    requiredPermissions: ['action_warehouse_inbound_record'],
    enabled: true,
    sortOrder: 10,
  },
  {
    id: 'warehouse_shipment_scan',
    titleKey: 'quickActions.actions.warehouseShipmentScan.title',
    descriptionKey: 'quickActions.actions.warehouseShipmentScan.description',
    icon: ScanLine,
    to: '/warehouse/shipment',
    search: { mode: 'scan' },
    requiredPermissions: ['action_warehouse_shipment_record'],
    enabled: true,
    sortOrder: 20,
  },
  {
    id: 'warehouse_stocktake_scan',
    titleKey: 'quickActions.actions.warehouseStocktakeScan.title',
    descriptionKey: 'quickActions.actions.warehouseStocktakeScan.description',
    icon: ClipboardCheck,
    to: '/warehouse/stocktake',
    search: { mode: 'scan' },
    requiredPermissions: ['action_warehouse_stocktake_manage'],
    enabled: true,
    sortOrder: 30,
  },
] satisfies QuickActionDefinition[]

export const quickActionRegistry: QuickActionDefinition[] = [...quickActionRegistryEntries].sort(
  (left, right) => left.sortOrder - right.sortOrder
)
