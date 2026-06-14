import { logistics } from './logistics'
import { logs } from './logs'
import { orders } from './orders'
import { suppliers } from './suppliers'
import { tabs } from './tabs'

export const purchaseEnUSOverrides = {
  purchase: {
    tabs,
    suppliers,
    orders,
    logs,
    logistics,
  },
} as const
