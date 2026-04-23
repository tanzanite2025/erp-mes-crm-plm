import type { CuttingIssuanceFilterDraft } from './types'

export const CUTTING_ISSUANCE_QUERY_KEYS = {
  orders: ['aps-scheduling', 'cutting-issuance', 'orders'] as const,
  templates: ['aps-scheduling', 'cutting-issuance', 'templates'] as const,
  executions: ['aps-scheduling', 'cutting-issuance', 'executions'] as const,
  traceReport: ['aps-scheduling', 'cutting-issuance', 'trace-report'] as const,
}

export const PRODUCTION_PLAN_STATUS_OPTIONS = [
  { value: 'ALL', label: '全部状态' },
  { value: 'SCHEDULED', label: '已排产' },
  { value: 'IN_PROGRESS', label: '生产中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELED', label: '已取消' },
] as const

export const DEFAULT_CUTTING_ISSUANCE_FILTER_DRAFT: CuttingIssuanceFilterDraft = {
  orderNo: '',
  productModel: '',
  status: 'ALL',
  holeCount: '',
  createdAtFrom: '',
  createdAtTo: '',
}
