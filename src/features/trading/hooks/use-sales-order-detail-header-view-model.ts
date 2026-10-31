import type { TranslationKey } from '@/locales'
import { isSalesOrderStatusEligibleForProduction } from '../data/sales-order-production-source-eligibility'
import type { SalesOrder } from '../data/schema'
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
  const showClaimBanner =
    isClaimAction && isSalesOrderStatusEligibleForProduction(order.status)
  const commandTitle =
    activeCommandTitle || t('tradingSalesOrder.detail.claimFallback')

  return {
    showClaimBanner,
    commandTitle,
    canSubmitPending: hasAvailableAction(order, 'submitPending'),
    canCancel: hasAvailableAction(order, 'cancel'),
    submitPendingPayload: {
      status: 'Pending',
    } as SalesOrderStatusCommandPayload,
    cancelPayload: { status: 'Canceled' } as SalesOrderStatusCommandPayload,
    cancelConfirmText: t('tradingSalesOrder.detail.cancelConfirm'),
  }
}
