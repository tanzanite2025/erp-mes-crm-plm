import type { ApprovalRequestSummary, Standard } from '../data/schema'

export interface ApprovalRequestSummaryApiDTO {
  id: string
  requesterId: string
  reason: string
  approver1Id?: string
  approver2Id?: string
  currentLevel: number
  status:
    | 'PENDING'
    | 'APPROVED_L1'
    | 'APPROVED'
    | 'REJECTED'
    | 'EXPIRED'
    | 'CONSUMED'
  expiresAt?: string | null
  module: string
  action: string
  createdAt: string
  verifierId?: string
}

export interface QualityStandardApiDTO {
  id: string
  createdAt?: string
  updatedAt?: string
  code: string
  name: string
  type?: string
  version?: number
  status?: string
  items?: unknown
  auditor?: string
  auditTime?: string | null
  reviewComment?: string
  rejectReason?: string
  publishedBy?: string
  publishedAt?: string | null
  archiveReason?: string
  archivedBy?: string
  archivedAt?: string | null
  remarks?: string
  description?: string
  approvalRequestSummary?: ApprovalRequestSummaryApiDTO | null
  [key: string]: unknown
}

export interface QualityStandardsListApiResponseDTO {
  items: QualityStandardApiDTO[]
  total: number
  page?: number
  pageSize?: number
  metadata?: {
    pagination?: {
      total?: number
      page?: number
      pageSize?: number
    }
    stats?: {
      total?: number
      draft?: number
      pendingApproval?: number
      approved?: number
      rejected?: number
      published?: number
      archived?: number
    }
  }
  [key: string]: unknown
}

function normalizeStandardType(type?: string): Standard['type'] {
  const normalized = type?.toUpperCase()
  if (type === '巡检' || normalized === 'IPQC') return 'IPQC'
  if (type === '首检' || normalized === 'FQC') return 'FQC'
  if (type === '出货检验' || normalized === 'OQC') return 'OQC'
  return 'IQC'
}

function normalizeStandardStatus(status?: string): Standard['status'] {
  const normalized = status?.toUpperCase()
  if (status === '草稿' || normalized === 'DRAFT') return 'DRAFT'
  if (status === '待审核' || normalized === 'PENDING_APPROVAL')
    return 'PENDING_APPROVAL'
  if (status === '审批通过' || normalized === 'APPROVED') return 'APPROVED'
  if (status === '已驳回' || normalized === 'REJECTED') return 'REJECTED'
  if (status === '已归档' || normalized === 'ARCHIVED') return 'ARCHIVED'
  return 'PUBLISHED'
}

function normalizeStandardItems(items: unknown): Standard['items'] {
  return Array.isArray(items) ? (items as Standard['items']) : []
}

function normalizeApprovalRequestSummary(
  summary?: ApprovalRequestSummaryApiDTO | null
): ApprovalRequestSummary | undefined {
  if (!summary || !summary.id) {
    return undefined
  }

  return {
    id: summary.id,
    requesterId: summary.requesterId || '',
    reason: summary.reason || '',
    approver1Id: summary.approver1Id || undefined,
    approver2Id: summary.approver2Id || undefined,
    currentLevel: Number.isFinite(summary.currentLevel)
      ? Number(summary.currentLevel)
      : 1,
    status: summary.status,
    expiresAt: summary.expiresAt || undefined,
    module: summary.module || '',
    action: summary.action || '',
    createdAt: summary.createdAt,
    verifierId: summary.verifierId || undefined,
  }
}

export function createDefaultStandard(): Standard {
  return {
    id: '',
    code: '',
    version: 1,
    name: '',
    type: 'IQC',
    status: 'DRAFT',
    auditor: '',
    auditTime: undefined,
    reviewComment: '',
    rejectReason: '',
    publishedBy: undefined,
    publishedAt: undefined,
    archiveReason: '',
    archivedBy: undefined,
    archivedAt: undefined,
    operator: undefined,
    operateTime: undefined,
    remarks: '',
    items: [],
  }
}

export function toQualityStandardContract(
  dto: QualityStandardApiDTO
): Standard {
  return {
    id: dto.id,
    code: dto.code || '',
    version: Number.isFinite(dto.version) ? Number(dto.version) : 1,
    name: dto.name || '',
    type: normalizeStandardType(dto.type),
    status: normalizeStandardStatus(dto.status),
    auditor: dto.auditor || undefined,
    auditTime: dto.auditTime || undefined,
    reviewComment: dto.reviewComment || '',
    rejectReason: dto.rejectReason || '',
    publishedBy: dto.publishedBy || undefined,
    publishedAt: dto.publishedAt || undefined,
    archiveReason: dto.archiveReason || '',
    archivedBy: dto.archivedBy || undefined,
    archivedAt: dto.archivedAt || undefined,
    operator: undefined,
    operateTime: dto.updatedAt || undefined,
    remarks: dto.remarks ?? dto.description ?? '',
    approvalRequestSummary: normalizeApprovalRequestSummary(
      dto.approvalRequestSummary
    ),
    items: normalizeStandardItems(dto.items),
  }
}

export function toQualityStandardApiDTO(
  standard: Partial<Standard>
): Partial<QualityStandardApiDTO> {
  return {
    id: standard.id,
    code: standard.code?.trim() || '',
    name: standard.name?.trim() || '',
    type: standard.type ? normalizeStandardType(standard.type) : 'IQC',
    version: standard.version ?? 1,
    status: standard.status
      ? normalizeStandardStatus(standard.status)
      : 'DRAFT',
    items: standard.items ?? [],
    auditor: standard.auditor?.trim() || '',
    auditTime: standard.auditTime || null,
    reviewComment: standard.reviewComment?.trim() || '',
    rejectReason: standard.rejectReason?.trim() || '',
    publishedBy: standard.publishedBy?.trim() || '',
    publishedAt: standard.publishedAt || null,
    archiveReason: standard.archiveReason?.trim() || '',
    archivedBy: standard.archivedBy?.trim() || '',
    archivedAt: standard.archivedAt || null,
    remarks: standard.remarks?.trim() || '',
  }
}
