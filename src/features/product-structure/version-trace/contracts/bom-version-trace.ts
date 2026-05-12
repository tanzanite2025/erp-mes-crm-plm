import { type BOMRelationSidecar } from '../../utils/bom-relation-sidecar'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function toBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false
}

function toNullableString(value: unknown): string | null {
  const normalized = toString(value)
  return normalized ? normalized : null
}

function toSnapshot(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function toRelationSidecar(value: unknown): BOMRelationSidecar | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  if (toString(value.kind) !== 'parent_children_protocol' || toString(value.version) !== 'v1' || !isRecord(value.protocolDraft)) {
    return undefined
  }
  return {
    kind: 'parent_children_protocol',
    version: 'v1',
    protocolDraft: value.protocolDraft as unknown as BOMRelationSidecar['protocolDraft'],
  }
}

export interface BOMVersionRecordSummary {
  id: string
  bomId: string
  productId: string
  bomNo: string
  versionSequence: number
  displayVersionLabel: string
  operation: string
  status: string
  description: string
  revisionNo: string
  effectiveFrom: string | null
  effectiveTo: string | null
  changeType: string
  changeOrderNo: string
  siteCode: string
  isDefaultSite: boolean
  createdAt: string
  createdBy: string
}

export interface BOMVersionRecordDetail extends BOMVersionRecordSummary {
  snapshot: Record<string, unknown>
  relationSidecar?: BOMRelationSidecar
}

export function parseBOMVersionRecordSummary(value: unknown): BOMVersionRecordSummary {
  const record = isRecord(value) ? value : {}
  return {
    id: toString(record.id),
    bomId: toString(record.bomId),
    productId: toString(record.productId),
    bomNo: toString(record.bomNo),
    versionSequence: toNumber(record.versionSequence),
    displayVersionLabel: toString(record.displayVersionLabel) || 'V1.0',
    operation: toString(record.operation) || 'SAVE',
    status: toString(record.status),
    description: toString(record.description),
    revisionNo: toString(record.revisionNo),
    effectiveFrom: toNullableString(record.effectiveFrom),
    effectiveTo: toNullableString(record.effectiveTo),
    changeType: toString(record.changeType),
    changeOrderNo: toString(record.changeOrderNo),
    siteCode: toString(record.siteCode),
    isDefaultSite: toBoolean(record.isDefaultSite),
    createdAt: toString(record.createdAt),
    createdBy: toString(record.createdBy),
  }
}

export function parseBOMVersionRecordDetail(value: unknown): BOMVersionRecordDetail {
  const record = isRecord(value) ? value : {}
  const summary = parseBOMVersionRecordSummary(record)
  return {
    ...summary,
    snapshot: toSnapshot(record.snapshot),
    relationSidecar: toRelationSidecar(record.relationSidecar),
  }
}

export function parseBOMVersionRecordList(value: unknown): BOMVersionRecordSummary[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.map(parseBOMVersionRecordSummary)
}
