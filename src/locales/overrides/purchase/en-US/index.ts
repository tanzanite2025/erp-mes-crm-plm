import { tabs } from './tabs'
import { suppliers } from './suppliers'
import { orders } from './orders'
import { logs } from './logs'
import { logistics } from './logistics'

export const purchaseEnUSOverrides = {
  purchase: {
    tabs,
    suppliers,
    orders,
    logs,
    logistics,
  },
} as const
