import type { SalesOrderStatus } from './schema'

// Confirmed, unfinished orders remain usable throughout production preparation.
// Scheduling is retained for existing orders and progress from real plans.
export const SALES_ORDER_PRODUCTION_SOURCE_STATUSES = [
  'Pending',
  'Scheduling',
  'InProgress',
] as const satisfies readonly SalesOrderStatus[]

export function isSalesOrderStatusEligibleForProduction(
  status: SalesOrderStatus
) {
  return SALES_ORDER_PRODUCTION_SOURCE_STATUSES.some(
    (eligibleStatus) => eligibleStatus === status
  )
}
