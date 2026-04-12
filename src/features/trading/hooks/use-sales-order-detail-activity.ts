import { useCallback } from 'react'
import type { SalesOrder } from '../data/schema'

interface UseSalesOrderDetailActivityParams {
  order: SalesOrder
  canHardDelete?: boolean
  onHardDelete?: (id: string) => void
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
    onHardDelete(order.id)
  }, [confirmText, onHardDelete, order.id])

  return {
    canDelete,
    handleHardDelete,
  }
}
