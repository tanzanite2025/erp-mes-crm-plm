import type { Standard } from '../data/schema'

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
  remarks?: string
  description?: string
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
      published?: number
      draft?: number
      archived?: number
    }
  }
  [key: string]: unknown
}

function normalizeStandardType(type?: string): Standard['type'] {
  const normalized = type?.toUpperCase()
  if (type === '巡检' || normalized === 'IPQC') return 'IPQC'
  if (type === '首检' || normalized === 'FQC') return 'FQC'
  return 'IQC'
}

function normalizeStandardStatus(status?: string): Standard['status'] {
  const normalized = status?.toUpperCase()
  if (status === '已归档' || normalized === 'ARCHIVED') return 'ARCHIVED'
  if (
    status === '待审核' ||
    normalized === 'DRAFT' ||
    normalized === 'PENDING'
  ) {
    return 'DRAFT'
  }
  return 'PUBLISHED'
}

function normalizeStandardItems(items: unknown): Standard['items'] {
  return Array.isArray(items) ? (items as Standard['items']) : []
}

export function createDefaultStandard(): Standard {
  return {
    id: '',
    code: '',
    version: 1,
    name: '',
    type: 'IQC',
    status: 'PUBLISHED',
    auditor: '',
    auditTime: undefined,
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
    operator: undefined,
    operateTime: dto.updatedAt || undefined,
    remarks: dto.remarks ?? dto.description ?? '',
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
      : 'PUBLISHED',
    items: standard.items ?? [],
    auditor: standard.auditor?.trim() || '',
    auditTime: standard.auditTime || null,
    remarks: standard.remarks?.trim() || '',
  }
}
