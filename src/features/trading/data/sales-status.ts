import type { TranslationKey } from '@/locales'
import type { SalesOrderStatus } from './schema'

export interface SalesStatusMeta {
  value: SalesOrderStatus
  label: string
  color: string
}

const SALES_STATUS_TRANSLATION_KEYS: Record<SalesOrderStatus, TranslationKey> = {
  Draft: 'tradingSalesOrder.status.draft',
  Pending: 'tradingSalesOrder.status.pending',
  InProgress: 'tradingSalesOrder.status.inProgress',
  Done: 'tradingSalesOrder.status.done',
  Canceled: 'tradingSalesOrder.status.canceled',
}

export const salesStatusMeta: SalesStatusMeta[] = [
  { value: 'Draft', label: '', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  { value: 'Pending', label: '', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { value: 'InProgress', label: '', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { value: 'Done', label: '', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { value: 'Canceled', label: '', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
]

export function getSalesStatusMeta(status: string) {
  return salesStatusMeta.find((item) => item.value === status) || {
    value: status as SalesOrderStatus,
    label: status,
    color: 'bg-muted/10 text-muted-foreground border-muted/20',
  }
}

export function getSalesStatusLabel(
  status: string,
  translate?: (key: TranslationKey, params?: Record<string, string | number>) => string
) {
  const translationKey = SALES_STATUS_TRANSLATION_KEYS[status as SalesOrderStatus]
  if (translationKey && translate) return translate(translationKey)
  return getSalesStatusMeta(status).label
}
