import type { ProcessModuleViewItem } from './adapter'
import type { ProcessModuleItem } from './types'

export function adaptApsProcessModuleItems(
  items: ProcessModuleItem[]
): ProcessModuleViewItem[] {
  return items.map((item) => ({
    ...item,
    contextLabel: 'APS 排产',
    capacityLabel: `排产负载 ${item.capacity}`,
  }))
}
