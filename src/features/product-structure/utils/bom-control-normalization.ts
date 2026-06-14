import {
  type BomStatus,
  normalizeBomChangeType,
  normalizeBomNo,
  normalizeBomStatus,
  normalizeBomVersion,
  normalizeEngineeringDateProtocol,
  normalizeRevisionNo,
  normalizeSiteCode,
} from '@/lib/codecs/code-normalization'
import { type SaveBOMInput } from '../mutation-types'

export function normalizeEngineeringRevisionNo(
  value?: string | null,
  fallback = 'R1'
): string {
  return normalizeRevisionNo(value, fallback)
}

function normalizeBOMSiteCode(value?: string | null): string {
  return normalizeSiteCode(value)
}

function normalizeBOMEffectiveDate(value?: string | null): string {
  return normalizeEngineeringDateProtocol(value)
}

function normalizeBOMNoValue(value?: string | null): string {
  return normalizeBomNo(value)
}

export function normalizeEngineeringBomVersion(
  value?: string | null,
  fallback = 'V1.0'
): string {
  return normalizeBomVersion(value, fallback)
}

export function normalizeEngineeringBomChangeType(
  value?: string | null,
  fallback: 'MANUAL' | 'ECO' | 'ECN' = 'MANUAL'
): 'MANUAL' | 'ECO' | 'ECN' {
  return normalizeBomChangeType(value, fallback)
}

export function normalizeEngineeringBomStatus(
  value?: string | null,
  fallback: BomStatus = 'DRAFT'
): BomStatus {
  return normalizeBomStatus(value, fallback) as BomStatus
}

export function normalizeBOMControlFieldPatch<
  T extends {
    changeType?: string | null
    status?: string | null
    revisionNo?: string | null
    siteCode?: string | null
    effectiveFrom?: string | null
    effectiveTo?: string | null
    isDefaultSite?: boolean | null
  },
>(data: T): T {
  const normalized = { ...data } as T

  if ('changeType' in data) {
    normalized.changeType = normalizeEngineeringBomChangeType(
      data.changeType
    ) as T['changeType']
  }
  if ('status' in data) {
    normalized.status = normalizeEngineeringBomStatus(
      data.status as any
    ) as T['status']
  }
  if ('revisionNo' in data) {
    normalized.revisionNo = normalizeEngineeringRevisionNo(
      data.revisionNo
    ) as T['revisionNo']
  }
  if ('effectiveFrom' in data) {
    normalized.effectiveFrom = (normalizeBOMEffectiveDate(data.effectiveFrom) ||
      '') as T['effectiveFrom']
  }
  if ('effectiveTo' in data) {
    normalized.effectiveTo = (normalizeBOMEffectiveDate(data.effectiveTo) ||
      '') as T['effectiveTo']
  }
  if ('siteCode' in data) {
    const normalizedSiteCode = normalizeBOMSiteCode(data.siteCode)
    normalized.siteCode = normalizedSiteCode as T['siteCode']
    normalized.isDefaultSite = (data.isDefaultSite ??
      !normalizedSiteCode) as T['isDefaultSite']
  }

  return normalized
}

export function normalizeBOMInput(data: SaveBOMInput): SaveBOMInput {
  return {
    ...data,
    bomNo: normalizeBOMNoValue(data.bomNo),
    bomVersion: normalizeEngineeringBomVersion(data.bomVersion),
    changeType: normalizeEngineeringBomChangeType(data.changeType),
    status: normalizeEngineeringBomStatus(data.status as any),
    revisionNo: normalizeEngineeringRevisionNo(data.revisionNo),
    effectiveFrom: normalizeBOMEffectiveDate(data.effectiveFrom) || undefined,
    effectiveTo: normalizeBOMEffectiveDate(data.effectiveTo) || undefined,
  }
}
