import type { TranslationKey } from '@/locales'
import type { AuditStatusDisplayMeta } from '@/components/common/audit-status-display'
import {
  canPerformPurchaseOrderAction,
  normalizePurchaseOrderStatus,
  type PurchaseOrderStatus,
} from './purchase-order-state-machine'

export type { PurchaseOrderStatus }

export interface PurchaseStatusMeta {
  value: PurchaseOrderStatus
  label: string
  color: string
  description?: string
}

export { normalizePurchaseOrderStatus }

const PURCHASE_STATUS_TRANSLATION_KEYS: Record<
  PurchaseOrderStatus,
  TranslationKey
> = {
  Draft: 'purchase.orders.statusDraft',
  Sent: 'purchase.orders.statusSent',
  Awaiting: 'purchase.orders.statusAwaiting',
  Received: 'purchase.orders.statusReceived',
  Canceled: 'purchase.orders.statusCanceled',
}

export const purchaseOrderStatuses: PurchaseStatusMeta[] = [
  {
    value: 'Draft',
    label: '',
    color: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    description: '',
  },
  {
    value: 'Sent',
    label: '',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    description: '',
  },
  {
    value: 'Awaiting',
    label: '',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    description: '',
  },
  {
    value: 'Received',
    label: '',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    description: '',
  },
  {
    value: 'Canceled',
    label: '',
    color: 'bg-red-500/10 text-rose-600 border-red-500/20',
    description: '',
  },
]

export const canEditPurchaseOrder = (status: PurchaseOrderStatus): boolean =>
  canPerformPurchaseOrderAction(status, 'save')

export const canReceivePurchaseOrder = (status: PurchaseOrderStatus): boolean =>
  canPerformPurchaseOrderAction(status, 'confirmReceipt')

export const needsApprovalWorkflow = (status: PurchaseOrderStatus): boolean =>
  status !== 'Draft' && status !== 'Canceled'

export const getPurchaseStatusMeta = (status: string) =>
  purchaseOrderStatuses.find((item) => item.value === status) || {
    value: status as PurchaseOrderStatus,
    label: status,
    color: 'bg-muted/10 text-muted-foreground border-muted/20',
  }

export function getPurchaseStatusLabel(
  status: string,
  translate?: (
    key: TranslationKey,
    params?: Record<string, string | number>
  ) => string
) {
  const translationKey =
    PURCHASE_STATUS_TRANSLATION_KEYS[status as PurchaseOrderStatus]
  if (translationKey && translate) return translate(translationKey)
  return getPurchaseStatusMeta(status).label
}

export function getPurchaseStatusDisplayMeta(
  status: string,
  translate?: (
    key: TranslationKey,
    params?: Record<string, string | number>
  ) => string
): AuditStatusDisplayMeta {
  const label = getPurchaseStatusLabel(status, translate)

  switch (status as PurchaseOrderStatus) {
    case 'Draft':
      return {
        label,
        className: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        dotClassName: 'bg-slate-500',
      }
    case 'Sent':
      return {
        label,
        className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        dotClassName: 'bg-blue-500',
      }
    case 'Awaiting':
      return {
        label,
        className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        dotClassName: 'bg-amber-500',
      }
    case 'Received':
      return {
        label,
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        dotClassName: 'bg-emerald-500',
      }
    case 'Canceled':
      return {
        label,
        className: 'bg-red-500/10 text-rose-600 border-red-500/20',
        dotClassName: 'bg-rose-500',
      }
    default:
      return {
        label,
        className: 'bg-muted/10 text-muted-foreground border-muted/20',
        dotClassName: 'bg-muted-foreground',
      }
  }
}
