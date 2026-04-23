import type { CuttingIssuanceExecutionFilters, CuttingIssuanceFilterDraft } from './types'

export function formatDateLabel(value: string | undefined): string {
  if (!value) {
    return '--'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

export function formatNumber(value: number | undefined): string {
  if (!Number.isFinite(value)) {
    return '0'
  }
  return Number(value).toLocaleString()
}

export function validateFilterDateRange(draft: CuttingIssuanceFilterDraft): string | null {
  if (!draft.createdAtFrom || !draft.createdAtTo) {
    return null
  }
  const from = new Date(draft.createdAtFrom)
  const to = new Date(draft.createdAtTo)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return '日期格式无效，请重新选择。'
  }
  if (from.getTime() > to.getTime()) {
    return '开始日期不能晚于结束日期。'
  }
  return null
}

export function buildExecutionFilters(draft: CuttingIssuanceFilterDraft): CuttingIssuanceExecutionFilters {
  const filters: CuttingIssuanceExecutionFilters = {}

  const orderNo = draft.orderNo.trim()
  if (orderNo) {
    filters.orderNo = orderNo
  }

  const productModel = draft.productModel.trim()
  if (productModel) {
    filters.productModel = productModel
  }

  if (draft.status && draft.status !== 'ALL') {
    filters.status = draft.status
  }

  const holeCount = Number.parseInt(draft.holeCount.trim(), 10)
  if (Number.isFinite(holeCount) && holeCount >= 0) {
    filters.holeCount = holeCount
  }

  const createdAtFrom = draft.createdAtFrom.trim()
  if (createdAtFrom) {
    filters.createdAtFrom = createdAtFrom
  }

  const createdAtTo = draft.createdAtTo.trim()
  if (createdAtTo) {
    filters.createdAtTo = createdAtTo
  }

  return filters
}

export function buildFilterTagList(filters: CuttingIssuanceExecutionFilters): string[] {
  const tags: string[] = []
  if (filters.orderNo) {
    tags.push(`订单号: ${filters.orderNo}`)
  }
  if (filters.productModel) {
    tags.push(`型号: ${filters.productModel}`)
  }
  if (filters.status) {
    tags.push(`状态: ${filters.status}`)
  }
  if (typeof filters.holeCount === 'number') {
    tags.push(`孔数: ${filters.holeCount}`)
  }
  if (filters.createdAtFrom) {
    tags.push(`开始: ${filters.createdAtFrom}`)
  }
  if (filters.createdAtTo) {
    tags.push(`结束: ${filters.createdAtTo}`)
  }
  return tags
}
