import type { SalesOrder } from '../data/schema'
import type { TranslationKey } from '@/locales'

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
    canSubmitPending: order.status === 'Draft',
    canStartProduction: order.status === 'Pending',
    canMarkDone: order.status === 'InProgress',
    canCancel: order.status === 'Draft' || order.status === 'Pending',
    submitPendingPayload: { id: order.id, status: 'Pending' as const },
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
