import type { ProcessModuleItem } from './types'

export type ProcessModuleContext = 'aps' | 'line-management'

export type ProcessModuleViewItem = ProcessModuleItem & {
  contextLabel: string
  capacityLabel: string
}
