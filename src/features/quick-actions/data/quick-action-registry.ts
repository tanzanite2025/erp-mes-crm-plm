import { ClipboardCheck, PackagePlus, ScanLine } from 'lucide-react'
import type { QuickActionDefinition } from '../types'

const quickActionRegistryEntries = [
  {
    id: 'warehouse_inbound_scan',
    title: 'Inbound Scan',
    description: 'Open warehouse inbound scanning mode directly for rapid receiving.',
    icon: PackagePlus,
    to: '/warehouse/inbound',
    search: { mode: 'scan' },
    requiredPermissions: ['action_warehouse_inbound_record'],
    enabled: true,
    sortOrder: 10,
  },
  {
    id: 'warehouse_shipment_scan',
    title: 'Shipment Scan',
    description: 'Open warehouse shipment scanning mode directly for rapid outbound processing.',
    icon: ScanLine,
    to: '/warehouse/shipment',
    search: { mode: 'scan' },
    requiredPermissions: ['action_warehouse_shipment_record'],
    enabled: true,
    sortOrder: 20,
  },
  {
    id: 'warehouse_stocktake_scan',
    title: 'Stocktake Scan',
    description: 'Open PDA stocktake scanning mode directly.',
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
