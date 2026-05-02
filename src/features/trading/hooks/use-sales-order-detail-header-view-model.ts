import type { SalesOrder } from '../data/schema'
import type { TranslationKey } from '@/locales'

function hasAvailableAction(order: SalesOrder, action: string) {
  if (!order.availableActions || order.availableActions.length === 0) {
    return false
  }

  return order.availableActions.some(
    (item) => item.action === action && item.allowed
  )
}

interface UseSalesOrderDetailHeaderViewModelParams {
  order: SalesOrder
  isClaimAction: boolean
  activeCommandTitle?: string
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

export function useSalesOrderDetailHeaderViewModel({
  order,
  isClaimAction,
  activeCommandTitle,
  t,
}: UseSalesOrderDetailHeaderViewModelParams) {
  const showClaimBanner = isClaimAction && order.status === 'Pending'
  const commandTitle = activeCommandTitle || t('tradingSalesOrder.detail.claimFallback')

  return {
    showClaimBanner,
    commandTitle,
    canSubmitPending: hasAvailableAction(order, 'submitPending'),
    canStartScheduling: hasAvailableAction(order, 'startScheduling'),
    canStartProduction: hasAvailableAction(order, 'startProduction'),
    canMarkDone: hasAvailableAction(order, 'markDone'),
    canCancel: hasAvailableAction(order, 'cancel'),
    submitPendingPayload: { id: order.id, status: 'Pending' as const },
    startSchedulingPayload: {
      id: order.id,
      status: 'Scheduling' as const,
      statusNote: t('tradingSalesOrder.detail.schedulingTriggered'),
    },
    startProductionPayload: {
      id: order.id,
      status: 'InProgress' as const,
      statusNote: t('tradingSalesOrder.detail.productionTriggered'),
    },
    markDonePayload: { id: order.id, status: 'Done' as const },
    cancelPayload: { id: order.id, status: 'Canceled' as const },
    cancelConfirmText: t('tradingSalesOrder.detail.cancelConfirm'),
  }
}
