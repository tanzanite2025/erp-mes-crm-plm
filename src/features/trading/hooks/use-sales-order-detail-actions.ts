import type { TranslationKey } from '@/locales'
import { toast } from 'sonner'
import { failLoudly } from '@/lib/safe-catch'
import type { SalesOrder, SalesOrderStatus } from '../data/schema'
import { requireCommandActor } from '@/lib/command-actor'

export interface SalesOrderStatusCommandPayload {
  status: SalesOrderStatus
  statusNote?: string
}

interface UseSalesOrderDetailActionsParams {
  order?: SalesOrder
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
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
  t,
  allowsAction,
  claimMutation,
  statusTransitionMutation,
  cancelMutation,
  operator,
  actorId,
}: UseSalesOrderDetailActionsParams) {
  const ensureCommandActor = (scope: string) => {
    try {
      return requireCommandActor({ operator, actorId }, scope)
    } catch {
      toast.error(t('tradingSalesOrder.errors.missingActor'))
      return null
    }
  }

  const ensureOrder = (scope: string) => {
    if (order) {
      return order
    }

    const error = new Error(
      `[CRITICAL] Missing sales order detail context in ${scope}`
    )
    failLoudly(error, scope, { silentUI: true })
    toast.error(t('tradingSalesOrder.errors.missingDetailOrder'))
    return null
  }

  const handleMutateStatus = (payload: SalesOrderStatusCommandPayload) => {
    const currentOrder = ensureOrder('SalesOrderDetail.handleMutateStatus')
    if (!currentOrder) return
    if (!allowsAction('action_trading_sales_order_manage')) return

    const nextStatus = payload.status
    const nextStatusNote = payload.statusNote
    if (!nextStatus) return

    const actor = ensureCommandActor('SalesOrderDetail.handleMutateStatus')
    if (!actor) return

    if (nextStatus === 'Canceled') {
      cancelMutation.mutate({
        orderId: currentOrder.id,
        reason: nextStatusNote,
        operator: actor.operator,
        actorId: actor.actorId,
        expectedVersion: currentOrder.version,
      })
      return
    }

    if (
      nextStatus === currentOrder.status &&
      (nextStatusNote ?? '') === (currentOrder.statusNote ?? '')
    )
      return

    statusTransitionMutation.mutate({
      orderId: currentOrder.id,
      status: nextStatus,
      statusNote: nextStatusNote,
      operator: actor.operator,
      actorId: actor.actorId,
      expectedVersion: currentOrder.version,
    })
  }

  const handleClaimModel = (model: string) => {
    const currentOrder = ensureOrder('SalesOrderDetail.handleClaimModel')
    if (!currentOrder) return
    if (!allowsAction('action_trading_sales_order_manage')) return

    const actor = ensureCommandActor('SalesOrderDetail.handleClaimModel')
    if (!actor) return

    const lineNos = currentOrder.lines
      .filter((line) => line.productModel === model && !line.claimedBy)
      .map((line) => line.lineNo)

    claimMutation.mutate({
      orderId: currentOrder.id,
      lineNos,
      operator: actor.operator,
      actorId: actor.actorId,
      expectedVersion: currentOrder.version,
    })
  }

  const handleClaimLine = (lineNo: number) => {
    const currentOrder = ensureOrder('SalesOrderDetail.handleClaimLine')
    if (!currentOrder) return
    if (!allowsAction('action_trading_sales_order_manage')) return

    const actor = ensureCommandActor('SalesOrderDetail.handleClaimLine')
    if (!actor) return

    claimMutation.mutate({
      orderId: currentOrder.id,
      lineNos: [lineNo],
      operator: actor.operator,
      actorId: actor.actorId,
      expectedVersion: currentOrder.version,
    })
  }

  return {
    handleClaimLine,
    handleClaimModel,
    handleMutateStatus,
  }
}
