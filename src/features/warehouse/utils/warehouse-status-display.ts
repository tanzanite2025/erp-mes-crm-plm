import type { AuditStatusDisplayMeta } from '@/components/common/audit-status-display'
import type { TranslationKey } from '@/locales'

type WarehouseTranslator = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function getAdjustmentStatusMeta(
  t: WarehouseTranslator,
  status: string
): AuditStatusDisplayMeta {
  switch (status) {
    case 'PENDING':
      return {
        label: t('warehouse.adjustment.status.pending'),
        className: 'bg-amber-500/10 text-amber-600 border-amber-200',
        dotClassName: 'bg-amber-500',
      }
    case 'APPROVED':
      return {
        label: t('warehouse.adjustment.status.approved'),
        className: 'bg-blue-500/10 text-blue-600 border-blue-200',
        dotClassName: 'bg-blue-500',
      }
    case 'EXECUTED':
      return {
        label: t('warehouse.adjustment.status.executed'),
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        dotClassName: 'bg-emerald-500',
      }
    case 'REJECTED':
      return {
        label: t('warehouse.adjustment.status.rejected'),
        className: 'bg-rose-500/10 text-rose-600 border-rose-200',
        dotClassName: 'bg-rose-500',
      }
    default:
      return {
        label: status,
        className: 'bg-muted text-muted-foreground border-muted/20',
        dotClassName: 'bg-muted-foreground',
      }
  }
}

export function getStocktakeStatusMeta(
  t: WarehouseTranslator,
  status: string
): AuditStatusDisplayMeta {
  switch (status) {
    case 'DRAFT':
      return {
        label: t('warehouse.stocktake.status.draft'),
        className: 'bg-muted text-muted-foreground/60 border-muted/20',
        dotClassName: 'bg-muted-foreground/60',
      }
    case 'IN_PROGRESS':
      return {
        label: t('warehouse.stocktake.status.inProgress'),
        className: 'bg-blue-500/10 text-blue-600 border-blue-200',
        dotClassName: 'bg-blue-500',
      }
    case 'COMPLETED':
      return {
        label: t('warehouse.stocktake.status.completed'),
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        dotClassName: 'bg-emerald-500',
      }
    case 'ADJUSTED':
      return {
        label: t('warehouse.stocktake.status.adjusted'),
        className: 'bg-amber-500/10 text-amber-600 border-amber-200',
        dotClassName: 'bg-amber-500',
      }
    default:
      return {
        label: status,
        className: 'bg-muted text-muted-foreground border-muted/20',
        dotClassName: 'bg-muted-foreground',
      }
  }
}
