import type { SalesOrder } from '../data/schema'
import type { TranslationKey } from '@/locales'
import type { SalesOrderStatusCommandPayload } from './use-sales-order-detail-actions'

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
    submitPendingPayload: { status: 'Pending' } as SalesOrderStatusCommandPayload,
    startSchedulingPayload: {
      status: 'Scheduling' as const,
      statusNote: t('tradingSalesOrder.detail.schedulingTriggered'),
    } satisfies SalesOrderStatusCommandPayload,
    startProductionPayload: {
      status: 'InProgress' as const,
      statusNote: t('tradingSalesOrder.detail.productionTriggered'),
    } satisfies SalesOrderStatusCommandPayload,
    markDonePayload: { status: 'Done' } as SalesOrderStatusCommandPayload,
    cancelPayload: { status: 'Canceled' } as SalesOrderStatusCommandPayload,
    cancelConfirmText: t('tradingSalesOrder.detail.cancelConfirm'),
  }
}
