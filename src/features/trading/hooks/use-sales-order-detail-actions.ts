import { toast } from 'sonner'
import { failLoudly } from '@/lib/safe-catch'
import type { SalesOrder } from '../data/schema'

interface UseSalesOrderDetailActionsParams {
  order?: SalesOrder
  allowsAction: (permission: string) => boolean
  claimMutation: {
    mutate: (payload: {
      orderId: string
      lineNos: number[]
      operator: string
      expectedVersion: number
      actorId?: string
    }) => void
  }
  statusTransitionMutation: {
    mutate: (payload: {
      orderId: string
      status: string
      statusNote?: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) => void
  }
  cancelMutation: {
    mutate: (payload: {
      orderId: string
      reason?: string
      operator: string
      expectedVersion: number
      actorId?: string
    }) => void
  }
  operator: string
  actorId?: string
}

export function useSalesOrderDetailActions({
  order,
  allowsAction,
  claimMutation,
  statusTransitionMutation,
  cancelMutation,
  operator,
  actorId,
}: UseSalesOrderDetailActionsParams) {
  const ensureClaimActor = () => {
    if (!actorId || !operator || operator === 'Unknown') {
      const error = new Error('[CRITICAL] Missing claim actor for sales order')
      failLoudly(error, 'SalesOrderDetail.claimActor')
      toast.error('缺少有效的认领操作人')
      return false
    }
    return true
  }

  const handleMutateStatus = (payload: Partial<SalesOrder>) => {
    if (!order) return
    if (!allowsAction('action_trading_sales_order_manage')) return

    const nextStatus = payload.status
    const nextStatusNote = payload.statusNote
    if (!nextStatus) return
    if (nextStatus === 'Canceled') {
      cancelMutation.mutate({
        orderId: order.id,
        reason: nextStatusNote,
        operator,
        actorId,
        expectedVersion: order.version,
      })
      return
    }
    if (nextStatus === order.status && (nextStatusNote ?? '') === (order.statusNote ?? '')) return

    statusTransitionMutation.mutate({
      orderId: order.id,
      status: nextStatus,
      statusNote: nextStatusNote,
      operator,
      actorId,
      expectedVersion: order.version,
    })
  }

  const handleClaimModel = (model: string) => {
    if (!order) return
    if (!allowsAction('action_trading_sales_order_manage')) return
    if (!ensureClaimActor()) return

    const lineNos = order.lines
      .filter((line) => line.productModel === model && !line.claimedBy)
      .map((line) => line.lineNo)
    claimMutation.mutate({
      orderId: order.id,
      lineNos,
      operator,
      actorId,
      expectedVersion: order.version,
    })
  }

  const handleClaimLine = (lineNo: number) => {
    if (!order) return
    if (!allowsAction('action_trading_sales_order_manage')) return
    if (!ensureClaimActor()) return

    claimMutation.mutate({
      orderId: order.id,
      lineNos: [lineNo],
      operator,
      actorId,
      expectedVersion: order.version,
    })
  }

  return {
    handleClaimLine,
    handleClaimModel,
    handleMutateStatus,
  }
}
