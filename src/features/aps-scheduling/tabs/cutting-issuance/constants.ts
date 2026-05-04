import { type TranslationKey } from '@/locales'

export const CUTTING_ISSUANCE_QUERY_KEYS = {
  orders: ['aps-scheduling', 'cutting-issuance', 'orders'] as const,
  templates: ['aps-scheduling', 'cutting-issuance', 'templates'] as const,
  executions: ['aps-scheduling', 'cutting-issuance', 'executions'] as const,
  traceReport: ['aps-scheduling', 'cutting-issuance', 'trace-report'] as const,
}

type Translator = (key: TranslationKey, params?: Record<string, string | number>) => string

export const PRODUCTION_PLAN_STATUS_ALL = 'ALL' as const

export const PRODUCTION_PLAN_STATUS_VALUES = [
  PRODUCTION_PLAN_STATUS_ALL,
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
] as const

export type ProductionPlanStatusValue = (typeof PRODUCTION_PLAN_STATUS_VALUES)[number]

export function getProductionPlanStatusOptions(t: Translator) {
  return PRODUCTION_PLAN_STATUS_VALUES.map((value) => ({
    value,
    label: getProductionPlanStatusLabel(value, t),
  }))
}

export function getProductionPlanStatusLabel(status: string, t: Translator): string {
  switch (status) {
    case PRODUCTION_PLAN_STATUS_ALL:
      return t('apsScheduling.cuttingIssuance.status.all')
    case 'SCHEDULED':
      return t('apsScheduling.cuttingIssuance.status.scheduled')
    case 'IN_PROGRESS':
      return t('apsScheduling.cuttingIssuance.status.inProgress')
    case 'COMPLETED':
      return t('apsScheduling.cuttingIssuance.status.completed')
    case 'CANCELED':
      return t('apsScheduling.cuttingIssuance.status.canceled')
    default:
      return t('apsScheduling.cuttingIssuance.status.unknown')
  }
}
