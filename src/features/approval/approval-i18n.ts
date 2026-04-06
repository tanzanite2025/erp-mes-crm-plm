import { TranslationKey } from '@/locales'

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
