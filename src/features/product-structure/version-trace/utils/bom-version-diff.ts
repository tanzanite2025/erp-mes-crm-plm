import { type BOMVersionRecordDetail } from '../contracts/bom-version-trace'

export type BOMVersionLineChange = {
  key: string
  section: string
  materialId: string
}

export type BOMVersionModifiedLineChange = BOMVersionLineChange & {
  changedFields: string[]
}

export type BOMVersionControlChange = {
  key: string
  beforeValue: unknown
  afterValue: unknown
}

export type BOMVersionStructureChange = {
  key: string
  beforeValue: unknown
  afterValue: unknown
}

export type BOMVersionDiffSummary = {
  targetBomNo: string
  leftVersionLabel: string
  rightVersionLabel: string
  leftItemCount: number
  rightItemCount: number
  addedItems: BOMVersionLineChange[]
  removedItems: BOMVersionLineChange[]
  modifiedItems: BOMVersionModifiedLineChange[]
  controlChanges: BOMVersionControlChange[]
  structureChanges: BOMVersionStructureChange[]
}

type BOMVersionItemSnapshot = {
  id: string
  section: string
  materialId: string
  unitPrice: number | null
  unit: string
  unitUsage: number | null
  wastagePercent: number | null
  standardUsage: number | null
  materialType: string
  supplyChannel: string
}

const CONTROL_FIELDS = [
  'bomNo',
  'productId',
  'version',
  'status',
  'description',
  'revisionNo',
  'effectiveFrom',
  'effectiveTo',
  'changeType',
  'changeOrderNo',
  'siteCode',
  'isDefaultSite',
] as const

const ITEM_FIELDS = [
  'section',
  'materialId',
  'unitPrice',
  'unit',
  'unitUsage',
  'wastagePercent',
  'standardUsage',
  'materialType',
  'supplyChannel',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeItemSnapshot(value: unknown): BOMVersionItemSnapshot | null {
  if (!isRecord(value)) {
    return null
  }
  const materialId = normalizeString(value.materialId)
  if (!materialId) {
    return null
  }
  return {
    id: normalizeString(value.id),
    section: normalizeString(value.section),
    materialId,
    unitPrice: normalizeNumber(value.unitPrice),
    unit: normalizeString(value.unit),
    unitUsage: normalizeNumber(value.unitUsage),
    wastagePercent: normalizeNumber(value.wastagePercent),
    standardUsage: normalizeNumber(value.standardUsage),
    materialType: normalizeString(value.materialType),
    supplyChannel: normalizeString(value.supplyChannel),
  }
}

function normalizeItems(value: unknown): BOMVersionItemSnapshot[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map(normalizeItemSnapshot)
    .filter((item): item is BOMVersionItemSnapshot => item !== null)
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${key}:${stableStringify(value[key])}`)
      .join(',')}}`
  }
  if (typeof value === 'string') {
    return value.trim()
  }
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

function isSameValue(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right)
}

function buildLineKey(item: BOMVersionItemSnapshot): string {
  return item.id || `${item.section}::${item.materialId}`
}

function toLineChange(item: BOMVersionItemSnapshot): BOMVersionLineChange {
  return {
    key: buildLineKey(item),
    section: item.section,
    materialId: item.materialId,
  }
}

function compareItems(
  before: BOMVersionItemSnapshot,
  after: BOMVersionItemSnapshot
): BOMVersionModifiedLineChange | null {
  const changedFields = ITEM_FIELDS.filter(
    (field) => !isSameValue(before[field], after[field])
  )
  if (changedFields.length === 0) {
    return null
  }
  return {
    ...toLineChange(after),
    changedFields: [...changedFields],
  }
}

function buildControlChanges(
  leftSnapshot: Record<string, unknown>,
  rightSnapshot: Record<string, unknown>
): BOMVersionControlChange[] {
  return CONTROL_FIELDS.flatMap((field) => {
    const beforeValue = leftSnapshot[field]
    const afterValue = rightSnapshot[field]
    if (isSameValue(beforeValue, afterValue)) {
      return []
    }
    return [{ key: field, beforeValue, afterValue }]
  })
}

function buildStructureChanges(
  left: BOMVersionRecordDetail,
  right: BOMVersionRecordDetail
): BOMVersionStructureChange[] {
  const fields: Array<{
    key: string
    beforeValue: unknown
    afterValue: unknown
  }> = [
    {
      key: 'kind',
      beforeValue: left.relationSidecar?.kind,
      afterValue: right.relationSidecar?.kind,
    },
    {
      key: 'version',
      beforeValue: left.relationSidecar?.version,
      afterValue: right.relationSidecar?.version,
    },
    {
      key: 'protocolDraft.rootChildren',
      beforeValue: left.relationSidecar?.protocolDraft?.rootChildren,
      afterValue: right.relationSidecar?.protocolDraft?.rootChildren,
    },
    {
      key: 'protocolDraft.branchNodes',
      beforeValue: left.relationSidecar?.protocolDraft?.branchNodes,
      afterValue: right.relationSidecar?.protocolDraft?.branchNodes,
    },
    {
      key: 'protocolDraft.itemNodes',
      beforeValue: left.relationSidecar?.protocolDraft?.itemNodes,
      afterValue: right.relationSidecar?.protocolDraft?.itemNodes,
    },
  ]

  return fields.flatMap((field) => {
    if (isSameValue(field.beforeValue, field.afterValue)) {
      return []
    }
    return [
      {
        key: field.key,
        beforeValue: field.beforeValue,
        afterValue: field.afterValue,
      },
    ]
  })
}

export function buildBOMVersionDiffSummary(
  left: BOMVersionRecordDetail,
  right: BOMVersionRecordDetail
): BOMVersionDiffSummary {
  const leftSnapshot = left.snapshot
  const rightSnapshot = right.snapshot
  const leftItems = normalizeItems(leftSnapshot.items)
  const rightItems = normalizeItems(rightSnapshot.items)
  const leftMap = new Map(leftItems.map((item) => [buildLineKey(item), item]))
  const rightMap = new Map(rightItems.map((item) => [buildLineKey(item), item]))

  const addedItems: BOMVersionLineChange[] = []
  const removedItems: BOMVersionLineChange[] = []
  const modifiedItems: BOMVersionModifiedLineChange[] = []

  rightMap.forEach((item, key) => {
    const before = leftMap.get(key)
    if (!before) {
      addedItems.push(toLineChange(item))
      return
    }
    const modified = compareItems(before, item)
    if (modified) {
      modifiedItems.push(modified)
    }
  })

  leftMap.forEach((item, key) => {
    if (!rightMap.has(key)) {
      removedItems.push(toLineChange(item))
    }
  })

  return {
    targetBomNo:
      normalizeString(rightSnapshot.bomNo) || right.bomNo || left.bomNo,
    leftVersionLabel: left.displayVersionLabel,
    rightVersionLabel: right.displayVersionLabel,
    leftItemCount: leftItems.length,
    rightItemCount: rightItems.length,
    addedItems,
    removedItems,
    modifiedItems,
    controlChanges: buildControlChanges(leftSnapshot, rightSnapshot),
    structureChanges: buildStructureChanges(left, right),
  }
}
