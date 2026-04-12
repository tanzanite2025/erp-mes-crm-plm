import { toast } from 'sonner'
import type { SalesOrder } from '../data/schema'
import { requireTradingCommandActor } from '../utils/command-actor'

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
  const ensureCommandActor = (scope: string) => {
    try {
      return requireTradingCommandActor({ operator, actorId }, scope)
    } catch {
      toast.error('缂哄皯鏈夋晥鐨勪氦鏄撴搷浣滀汉')
      return null
    }
  }

  const handleMutateStatus = (payload: Partial<SalesOrder>) => {
    if (!order) return
    if (!allowsAction('action_trading_sales_order_manage')) return

    const nextStatus = payload.status
    const nextStatusNote = payload.statusNote
    if (!nextStatus) return

    const actor = ensureCommandActor('SalesOrderDetail.handleMutateStatus')
    if (!actor) return

    if (nextStatus === 'Canceled') {
      cancelMutation.mutate({
        orderId: order.id,
        reason: nextStatusNote,
        operator: actor.operator,
        actorId: actor.actorId,
        expectedVersion: order.version,
      })
      return
    }

    if (nextStatus === order.status && (nextStatusNote ?? '') === (order.statusNote ?? '')) return

    statusTransitionMutation.mutate({
      orderId: order.id,
      status: nextStatus,
      statusNote: nextStatusNote,
      operator: actor.operator,
      actorId: actor.actorId,
      expectedVersion: order.version,
    })
  }

  const handleClaimModel = (model: string) => {
    if (!order) return
    if (!allowsAction('action_trading_sales_order_manage')) return

    const actor = ensureCommandActor('SalesOrderDetail.handleClaimModel')
    if (!actor) return

    const lineNos = order.lines
      .filter((line) => line.productModel === model && !line.claimedBy)
      .map((line) => line.lineNo)

    claimMutation.mutate({
      orderId: order.id,
      lineNos,
      operator: actor.operator,
      actorId: actor.actorId,
      expectedVersion: order.version,
    })
  }

  const handleClaimLine = (lineNo: number) => {
    if (!order) return
    if (!allowsAction('action_trading_sales_order_manage')) return

    const actor = ensureCommandActor('SalesOrderDetail.handleClaimLine')
    if (!actor) return

    claimMutation.mutate({
      orderId: order.id,
      lineNos: [lineNo],
      operator: actor.operator,
      actorId: actor.actorId,
      expectedVersion: order.version,
    })
  }

  return {
    handleClaimLine,
    handleClaimModel,
    handleMutateStatus,
  }
}
