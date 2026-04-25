import type { SalesOrder, SalesOrderStatus } from '../data/schema'

export const SALES_ORDER_EDITABLE_STATUSES: readonly SalesOrderStatus[] = [
  'Draft',
  'Pending',
]

export function isSalesOrderEditable(
  order: Pick<SalesOrder, 'status'> | null | undefined
): boolean {
  return Boolean(order && SALES_ORDER_EDITABLE_STATUSES.includes(order.status))
}

export function canRegisterSalesOrderReceipt(
  order: Pick<SalesOrder, 'status'> | null | undefined
): boolean {
  return Boolean(order && order.status !== 'Canceled')
}

export function isSalesOrderSnapshotOnly(
  order: Pick<SalesOrder, 'status'> | null | undefined
): boolean {
  return Boolean(order && !isSalesOrderEditable(order))
}
