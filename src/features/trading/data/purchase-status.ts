import type { TranslationKey } from '@/locales'

export type PurchaseOrderStatus = 'Draft' | 'Sent' | 'Awaiting' | 'Received' | 'Canceled'

export interface PurchaseStatusMeta {
  value: PurchaseOrderStatus
  label: string
  color: string
  description?: string
}

const PURCHASE_STATUS_TRANSLATION_KEYS: Record<PurchaseOrderStatus, TranslationKey> = {
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

export const canEditPurchaseOrder = (status: PurchaseOrderStatus): boolean => status === 'Draft'

export const canReceivePurchaseOrder = (status: PurchaseOrderStatus): boolean =>
  status === 'Sent' || status === 'Awaiting'

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
  translate?: (key: TranslationKey, params?: Record<string, string | number>) => string
) {
  const translationKey = PURCHASE_STATUS_TRANSLATION_KEYS[status as PurchaseOrderStatus]
  if (translationKey && translate) return translate(translationKey)
  return getPurchaseStatusMeta(status).label
}
