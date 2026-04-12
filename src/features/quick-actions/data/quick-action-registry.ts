import { ClipboardCheck, PackagePlus, ScanLine } from 'lucide-react'
import type { QuickActionDefinition } from '../types'

export const quickActionRegistry: QuickActionDefinition[] = [
  {
    id: 'warehouse_inbound_scan',
    title: '入库扫描',
    description: '直接进入入库扫描态，搜索后快速登记入库。',
    icon: PackagePlus,
    to: '/warehouse/inbound',
    search: { mode: 'scan' },
    requiredPermissions: ['action_warehouse_inbound_record'],
    enabled: true,
    sortOrder: 10,
  },
  {
    id: 'warehouse_shipment_scan',
    title: '出库扫描',
    description: '直接进入出库扫描态，快速开始出库登记。',
    icon: ScanLine,
    to: '/warehouse/shipment',
    search: { mode: 'scan' },
    requiredPermissions: ['action_warehouse_shipment_record'],
    enabled: true,
    sortOrder: 20,
  },
  {
    id: 'warehouse_stocktake_scan',
    title: '盘点扫描',
    description: '直接进入 PDA 盘点扫描模式。',
    icon: ClipboardCheck,
    to: '/warehouse/stocktake',
    search: { mode: 'scan' },
    requiredPermissions: ['action_warehouse_stocktake_manage'],
    enabled: true,
    sortOrder: 30,
  },
].sort((left, right) => left.sortOrder - right.sortOrder)
