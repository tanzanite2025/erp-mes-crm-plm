import { useCallback } from 'react'
import type { SalesOrder } from '../data/schema'

interface UseSalesOrderDetailActivityParams {
  order: SalesOrder
  canHardDelete?: boolean
  onHardDelete?: (order: SalesOrder) => void
  confirmText: string
}

export function useSalesOrderDetailActivity({
  order,
  canHardDelete,
  onHardDelete,
  confirmText,
}: UseSalesOrderDetailActivityParams) {
  const canDelete = Boolean(order.status === 'Canceled' && canHardDelete && onHardDelete)

  const handleHardDelete = useCallback(() => {
    if (!onHardDelete) return
    if (!confirm(confirmText)) return
    onHardDelete(order)
  }, [confirmText, onHardDelete, order])

  return {
    canDelete,
    handleHardDelete,
  }
}
