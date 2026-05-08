export type QualityStandardsTypeFilter = 'ALL' | 'IQC' | 'IPQC' | 'FQC'

export type QualityStandardsStatusFilter =
  | 'ALL'
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'ARCHIVED'

export interface QualityStandardsListStats {
  total: number
  draft: number
  pendingApproval: number
  approved: number
  rejected: number
  published: number
  archived: number
}

export interface QualityStandardsListMetadata {
  pagination: {
    total: number
    page: number
    pageSize: number
  }
  stats: QualityStandardsListStats
}

export interface GetQualityStandardsParams {
  page: number
  pageSize: number
  type?: QualityStandardsTypeFilter
  status?: QualityStandardsStatusFilter
  keyword?: string
}

export interface QualityStandardsListSearchState {
  page: number
  pageSize: number
  type: QualityStandardsTypeFilter
  status: QualityStandardsStatusFilter
  keyword: string
}
