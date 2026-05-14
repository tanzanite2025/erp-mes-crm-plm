import { type BusinessEventSource } from './business-event-source-types'

export interface BusinessEventStatusCatalogEntry {
  code: string
  label: string
  defaultResolve?: boolean
}

const SHARED_STATUS_CATALOG: Record<string, BusinessEventStatusCatalogEntry> = {
  Draft: { code: 'Draft', label: '草稿' },
  Pending: { code: 'Pending', label: '待处理' },
  InProgress: { code: 'InProgress', label: '进行中' },
  Done: { code: 'Done', label: '已完成', defaultResolve: true },
  Canceled: { code: 'Canceled', label: '已作废', defaultResolve: true },
}

const BUSINESS_EVENT_SOURCE_STATUS_CATALOG: Record<
  string,
  BusinessEventStatusCatalogEntry[]
> = {
  SALES_ORDER: [
    { code: 'Draft', label: '草稿' },
    { code: 'Pending', label: '待处理' },
    { code: 'InProgress', label: '正式下达' },
    { code: 'Done', label: '已完成', defaultResolve: true },
    { code: 'Canceled', label: '已作废', defaultResolve: true },
  ],
  PURCHASE_ORDER: [
    { code: 'Draft', label: '草稿' },
    { code: 'Sent', label: '已下达' },
    { code: 'Awaiting', label: '待收货' },
    { code: 'Received', label: '已收货', defaultResolve: true },
    { code: 'Canceled', label: '已作废', defaultResolve: true },
  ],
  LOGISTICS_RECORD: [
    { code: 'Draft', label: '草稿' },
    { code: 'Dispatched', label: '已派车' },
    { code: 'Loaded', label: '已装车' },
    { code: 'InTransit', label: '运输中' },
    { code: 'Signed', label: '已签收', defaultResolve: true },
    { code: 'Exception', label: '异常' },
    { code: 'Canceled', label: '已取消', defaultResolve: true },
  ],
  PRODUCTION_PLAN: [
    { code: 'SCHEDULED', label: '已排产' },
    { code: 'IN_PROGRESS', label: '生产中' },
    { code: 'COMPLETED', label: '计划完成', defaultResolve: true },
    { code: 'CANCELED', label: '已取消', defaultResolve: true },
  ],
  PRODUCTION_TASK: [
    { code: 'PENDING', label: '待执行' },
    { code: 'RUNNING', label: '执行中' },
    { code: 'HOLD', label: '已挂起' },
    { code: 'DONE', label: '已完工', defaultResolve: true },
  ],
  QUALITY_STANDARD: [
    { code: 'DRAFT', label: '草稿' },
    { code: 'PENDING_APPROVAL', label: '待审核' },
    { code: 'APPROVED', label: '审批通过' },
    { code: 'REJECTED', label: '已驳回' },
    { code: 'PUBLISHED', label: '已发布' },
    { code: 'ARCHIVED', label: '已归档', defaultResolve: true },
  ],
  BOM: [
    { code: 'DRAFT', label: '草稿' },
    { code: 'REVIEWING', label: '审核中' },
    { code: 'APPROVED', label: '审批通过' },
    { code: 'VALIDATING', label: '校验中' },
    { code: 'RELEASED', label: '已发布', defaultResolve: true },
    { code: 'OBSOLETE', label: '已作废', defaultResolve: true },
  ],
}

function formatStatusCode(statusCode: string) {
  return statusCode
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
}

export function getBusinessEventStatusCatalog(sourceCode?: string) {
  return sourceCode
    ? (BUSINESS_EVENT_SOURCE_STATUS_CATALOG[sourceCode] ?? [])
    : []
}

export function getBusinessEventStatusCatalogCandidates(sourceCode?: string) {
  const sourceEntries = getBusinessEventStatusCatalog(sourceCode)
  const sharedEntries = Object.values(SHARED_STATUS_CATALOG)
  const seen = new Set<string>()

  return [...sourceEntries, ...sharedEntries].filter((entry) => {
    const key = entry.code
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export function getBusinessEventStatusLabel(
  sourceCode: string | undefined,
  statusCode: string
) {
  const sourceEntry = getBusinessEventStatusCatalog(sourceCode).find(
    (entry: BusinessEventStatusCatalogEntry) => entry.code === statusCode
  )

  if (sourceEntry) {
    return sourceEntry.label
  }

  return SHARED_STATUS_CATALOG[statusCode]?.label ?? formatStatusCode(statusCode) ?? statusCode
}

export function isBusinessEventStatusDefaultResolve(
  sourceCode: string | undefined,
  statusCode: string
) {
  return Boolean(
    getBusinessEventStatusCatalog(sourceCode).find(
      (entry: BusinessEventStatusCatalogEntry) => entry.code === statusCode
    )?.defaultResolve ?? SHARED_STATUS_CATALOG[statusCode]?.defaultResolve
  )
}

export function getBusinessEventDefaultResolveStatuses(
  source: Pick<BusinessEventSource, 'code' | 'config'>
) {
  return source.config.statuses
    .map((status) => status.code)
    .filter((statusCode) =>
      isBusinessEventStatusDefaultResolve(source.code, statusCode)
    )
}
