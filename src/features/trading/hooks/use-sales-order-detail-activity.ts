import { useCallback } from 'react'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
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
  const canDelete = Boolean(
    order.status === 'Canceled' && canHardDelete && onHardDelete
  )

  const handleHardDelete = useCallback(async () => {
    if (!onHardDelete) return
    if (!(await requestApplicationConfirmation(confirmText))) return
    onHardDelete(order)
  }, [confirmText, onHardDelete, order])

  return {
    canDelete,
    handleHardDelete,
  }
}
