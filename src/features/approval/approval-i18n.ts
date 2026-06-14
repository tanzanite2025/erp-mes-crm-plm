import { type TranslationKey } from '@/locales'
import type { AuditStatusDisplayMeta } from '@/components/common/audit-status-display'

type ApprovalTranslator = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

const MODULE_KEYS = {
  Inventory: 'approval.modules.inventory',
  Trading: 'approval.modules.trading',
  Production: 'approval.modules.production',
  Materials: 'approval.modules.materials',
} as const satisfies Record<string, TranslationKey>

const ACTION_KEYS = {
  VOID: 'approval.actions.void',
  DELETE: 'approval.actions.delete',
  PRICE_OVERRIDE: 'approval.actions.price_override',
  SCRAP: 'approval.actions.scrap',
  EXPORT: 'approval.actions.export',
} as const satisfies Record<string, TranslationKey>

const STATUS_KEYS = {
  PENDING: 'approval.status.pending',
  APPROVED_L1: 'approval.status.approved_l1',
  APPROVED: 'approval.status.approved',
  REJECTED: 'approval.status.rejected',
  CONSUMED: 'approval.status.consumed',
  EXPIRED: 'approval.status.expired',
} as const satisfies Record<string, TranslationKey>

export function getApprovalModuleLabel(t: ApprovalTranslator, module: string) {
  const key = MODULE_KEYS[module as keyof typeof MODULE_KEYS]
  return key ? t(key) : module
}

export function getApprovalActionLabel(t: ApprovalTranslator, action: string) {
  const key = ACTION_KEYS[action as keyof typeof ACTION_KEYS]
  return key ? t(key) : action
}

export function getApprovalStatusLabel(t: ApprovalTranslator, status: string) {
  const key = STATUS_KEYS[status as keyof typeof STATUS_KEYS]
  return key ? t(key) : status
}

export function getApprovalStatusMeta(
  t: ApprovalTranslator,
  status: string
): AuditStatusDisplayMeta {
  const label = getApprovalStatusLabel(t, status)

  switch (status) {
    case 'APPROVED':
      return {
        label,
        className: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        dotClassName: 'bg-emerald-500',
      }
    case 'APPROVED_L1':
      return {
        label,
        className: 'bg-primary/10 text-primary border-primary/20',
        dotClassName: 'bg-primary',
      }
    case 'REJECTED':
      return {
        label,
        className: 'bg-destructive/10 text-destructive border-destructive/20',
        dotClassName: 'bg-destructive',
      }
    case 'CONSUMED':
      return {
        label,
        className: 'bg-muted/50 text-muted-foreground border-muted/20',
        dotClassName: 'bg-muted-foreground',
      }
    case 'EXPIRED':
      return {
        label,
        className: 'bg-muted/30 text-muted-foreground/60 border-muted/20',
        dotClassName: 'bg-muted-foreground/60',
      }
    case 'PENDING':
      return {
        label,
        className: 'bg-amber-500/10 text-amber-600 border-amber-200',
        dotClassName: 'bg-amber-500',
      }
    default:
      return {
        label,
        className: 'bg-muted text-muted-foreground border-muted/20',
        dotClassName: 'bg-muted-foreground',
      }
  }
}
