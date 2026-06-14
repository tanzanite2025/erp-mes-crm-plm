import { SearchCheck, Truck, type LucideIcon } from 'lucide-react'

export type ScanModuleHostKind = 'embedded-dialog' | 'standalone-page'
export type ScanModuleStatus = 'ready' | 'skeleton'

export interface ScanModuleCatalogItem {
  pluginCode: string
  icon: LucideIcon
  hostKind: ScanModuleHostKind
  hostLabel: string
  status: ScanModuleStatus
  statusLabel: string
  targetLabel: string
  openPath?: string
  openLabel: string
  supportsAddToHomeScreen: boolean
  installPath?: string
  addToHomeScreenLabel?: string
  notes: string[]
}

export const scanModuleCatalog: ScanModuleCatalogItem[] = [
  {
    pluginCode: 'logistics-inbound',
    icon: Truck,
    hostKind: 'embedded-dialog',
    hostLabel: '采购物流弹窗',
    status: 'ready',
    statusLabel: '可接入',
    targetLabel: 'Purchase Logistics Dialog',
    openPath: '/purchase/logistics',
    openLabel: '打开宿主页',
    supportsAddToHomeScreen: false,
    notes: [
      '已具备 adapter、use-case 与 helper，可以直接接现有采购物流弹窗。',
      '建议保持宿主表单为主，扫码只回填 trackingNo、carrier 和提交草稿。',
    ],
  },
  {
    pluginCode: 'wheel-trace',
    icon: SearchCheck,
    hostKind: 'standalone-page',
    hostLabel: '独立追溯页',
    status: 'ready',
    statusLabel: '真实接口',
    targetLabel: 'Wheel Trace Lookup',
    openPath: '/wheel-trace',
    openLabel: '打开独立页',
    supportsAddToHomeScreen: true,
    installPath: '/wheel-trace?install=1',
    addToHomeScreenLabel: '放到桌面',
    notes: [
      '已接入真实后端查询接口，当前返回条码解析、产品匹配和生产拓扑锚点。',
      '后续补真实过站记录时，只需要扩后端数据源，不需要重做独立页壳子。',
    ],
  },
]

export function getScanModuleCatalogItem(pluginCode: string) {
  return scanModuleCatalog.find((item) => item.pluginCode === pluginCode)
}
