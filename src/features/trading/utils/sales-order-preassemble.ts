import type { SalesOrder, SalesOrderStatus } from '../data/schema'

const DISALLOWED_PREASSEMBLE_SCAN_STATUSES = new Set<SalesOrderStatus>([
  'Canceled',
  'Done',
])

export function isSalesOrderPreassembleScanAllowed(
  order: Pick<SalesOrder, 'status'> | null | undefined
): boolean {
  if (!order) return false
  return !DISALLOWED_PREASSEMBLE_SCAN_STATUSES.has(order.status)
}
