import type { ProcessModuleItem } from './types'
import type { ProcessModuleViewItem } from './adapter'

export function adaptLineManagementProcessModuleItems(items: ProcessModuleItem[]): ProcessModuleViewItem[] {
  return items.map((item) => ({
    ...item,
    contextLabel: '产线管理',
    capacityLabel: `产线负载 ${item.capacity}`,
  }))
}
