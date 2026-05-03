import type { AuditLog } from '../types'

export type BomAuditOperation = 'create' | 'update' | 'delete' | 'unknown'

export type BomAuditLineChange = {
  key: string
  section: string
  materialId: string
  substituteCount: number
}

export type BomAuditModifiedLineChange = BomAuditLineChange & {
  changedFields: string[]
  substituteDelta: {
    added: number
    removed: number
    updated: number
  }
}

export type BomAuditControlChange = {
  key: string
  beforeValue: unknown
  afterValue: unknown
}

export type BomAuditSummary = {
  operation: BomAuditOperation
  targetBomNo: string
  beforeItemCount: number
  afterItemCount: number
  addedItems: BomAuditLineChange[]
  removedItems: BomAuditLineChange[]
  modifiedItems: BomAuditModifiedLineChange[]
  controlChanges: BomAuditControlChange[]
  substituteChangeCount: number
}

type BomAuditSubstituteSnapshot = {
  id: string
  materialId: string
  priority: number
  conversionRate: number
  notes: string
}

type BomAuditItemSnapshot = {
  id: string
  section: string
  materialId: string
  unitPrice: number | null
  unit: string
  unitUsage: number | null
  wastagePercent: number | null
  materialType: string
  supplyChannel: string
  substitutes: BomAuditSubstituteSnapshot[]
}

const BOM_CONTROL_FIELDS = [
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

const BOM_ITEM_FIELDS = [
  'section',
  'materialId',
  'unitPrice',
  'unit',
  'unitUsage',
  'wastagePercent',
  'materialType',
  'supplyChannel',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeAuditString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeAuditNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeSubstituteSnapshot(value: unknown): BomAuditSubstituteSnapshot | null {
  if (!isRecord(value)) {
    return null
  }

  const materialId = normalizeAuditString(value.materialId)
  if (!materialId) {
    return null
  }

  return {
    id: normalizeAuditString(value.id),
    materialId,
    priority: normalizeAuditNumber(value.priority) ?? 0,
    conversionRate: normalizeAuditNumber(value.conversionRate) ?? 0,
    notes: normalizeAuditString(value.notes),
  }
}

function normalizeItemSnapshot(value: unknown): BomAuditItemSnapshot | null {
  if (!isRecord(value)) {
    return null
  }

  const materialId = normalizeAuditString(value.materialId)
  if (!materialId) {
    return null
  }

  const substitutes = Array.isArray(value.substitutes)
    ? value.substitutes
        .map(normalizeSubstituteSnapshot)
        .filter((item): item is BomAuditSubstituteSnapshot => item !== null)
    : []

  return {
    id: normalizeAuditString(value.id),
    section: normalizeAuditString(value.section),
    materialId,
    unitPrice: normalizeAuditNumber(value.unitPrice),
    unit: normalizeAuditString(value.unit),
    unitUsage: normalizeAuditNumber(value.unitUsage),
    wastagePercent: normalizeAuditNumber(value.wastagePercent),
    materialType: normalizeAuditString(value.materialType),
    supplyChannel: normalizeAuditString(value.supplyChannel),
    substitutes,
  }
}

function normalizeItems(value: unknown): BomAuditItemSnapshot[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(normalizeItemSnapshot)
    .filter((item): item is BomAuditItemSnapshot => item !== null)
}

function readDiffEntry(log: AuditLog, field: string) {
  return log.diff.find((item) => item.f === field)
}

function readDiffValue(log: AuditLog, field: string): unknown {
  return readDiffEntry(log, field)?.n
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

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false
  }
  if (typeof value === 'string') {
    return value.trim() !== ''
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  if (typeof value === 'object') {
    return Object.keys(value).length > 0
  }
  return true
}

function isSameValue(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right)
}

function buildLineKey(item: BomAuditItemSnapshot): string {
  return item.id || `${item.section}::${item.materialId}`
}

function buildSubstituteKey(item: BomAuditSubstituteSnapshot): string {
  return item.id || `${item.materialId}::${item.priority}`
}

function toLineChange(item: BomAuditItemSnapshot): BomAuditLineChange {
  return {
    key: buildLineKey(item),
    section: item.section,
    materialId: item.materialId,
    substituteCount: item.substitutes.length,
  }
}

function compareSubstitutes(beforeItems: BomAuditSubstituteSnapshot[], afterItems: BomAuditSubstituteSnapshot[]) {
  const beforeMap = new Map(beforeItems.map((item) => [buildSubstituteKey(item), item]))
  const afterMap = new Map(afterItems.map((item) => [buildSubstituteKey(item), item]))

  let added = 0
  let removed = 0
  let updated = 0

  afterMap.forEach((item, key) => {
    const before = beforeMap.get(key)
    if (!before) {
      added += 1
      return
    }

    if (
      !isSameValue(before.conversionRate, item.conversionRate) ||
      !isSameValue(before.notes, item.notes)
    ) {
      updated += 1
    }
  })

  beforeMap.forEach((_item, key) => {
    if (!afterMap.has(key)) {
      removed += 1
    }
  })

  return { added, removed, updated }
}

function compareItems(before: BomAuditItemSnapshot, after: BomAuditItemSnapshot): BomAuditModifiedLineChange | null {
  const changedFields = BOM_ITEM_FIELDS.filter((field) => !isSameValue(before[field], after[field]))
  const substituteDelta = compareSubstitutes(before.substitutes, after.substitutes)
  const hasSubstituteChange = substituteDelta.added + substituteDelta.removed + substituteDelta.updated > 0

  if (changedFields.length === 0 && !hasSubstituteChange) {
    return null
  }

  return {
    ...toLineChange(after),
    changedFields: [...changedFields],
    substituteDelta,
  }
}

function deriveOperation(log: AuditLog, beforeItems: BomAuditItemSnapshot[], afterItems: BomAuditItemSnapshot[]): BomAuditOperation {
  const operation = normalizeAuditString(readDiffValue(log, 'operation')).toLowerCase()
  if (operation === 'create' || operation === 'update' || operation === 'delete') {
    return operation
  }

  const action = log.action.trim().toLowerCase()
  if (action === 'delete') {
    return 'delete'
  }
  if (action === 'create') {
    return 'create'
  }
  if (beforeItems.length === 0 && afterItems.length > 0) {
    return 'create'
  }
  if (beforeItems.length > 0 || afterItems.length > 0) {
    return 'update'
  }
  return 'unknown'
}

function buildControlChanges(log: AuditLog, operation: BomAuditOperation): BomAuditControlChange[] {
  return BOM_CONTROL_FIELDS.flatMap((field) => {
    const entry = readDiffEntry(log, field)
    if (!entry) {
      return []
    }

    if (operation === 'create') {
      return hasMeaningfulValue(entry.n)
        ? [{ key: field, beforeValue: entry.o, afterValue: entry.n }]
        : []
    }

    if (!isSameValue(entry.o, entry.n)) {
      return [{ key: field, beforeValue: entry.o, afterValue: entry.n }]
    }

    return []
  })
}

export function buildBomAuditSummary(log: AuditLog): BomAuditSummary {
  const beforeItemsRaw = normalizeItems(readDiffEntry(log, 'items')?.o)
  const afterItemsRaw = normalizeItems(readDiffEntry(log, 'items')?.n)
  const operation = deriveOperation(log, beforeItemsRaw, afterItemsRaw)
  const effectiveAfterItems = operation === 'delete' ? [] : afterItemsRaw

  const beforeMap = new Map(beforeItemsRaw.map((item) => [buildLineKey(item), item]))
  const afterMap = new Map(effectiveAfterItems.map((item) => [buildLineKey(item), item]))

  const addedItems: BomAuditLineChange[] = []
  const removedItems: BomAuditLineChange[] = []
  const modifiedItems: BomAuditModifiedLineChange[] = []

  afterMap.forEach((item, key) => {
    const before = beforeMap.get(key)
    if (!before) {
      addedItems.push(toLineChange(item))
      return
    }

    const modified = compareItems(before, item)
    if (modified) {
      modifiedItems.push(modified)
    }
  })

  beforeMap.forEach((item, key) => {
    if (!afterMap.has(key)) {
      removedItems.push(toLineChange(item))
    }
  })

  const targetBomNo = normalizeAuditString(readDiffValue(log, 'bomNo')) || log.target_id
  const controlChanges = buildControlChanges(log, operation)
  const substituteChangeCount = modifiedItems.reduce(
    (sum, item) => sum + item.substituteDelta.added + item.substituteDelta.removed + item.substituteDelta.updated,
    0,
  )

  return {
    operation,
    targetBomNo,
    beforeItemCount: beforeItemsRaw.length,
    afterItemCount: effectiveAfterItems.length,
    addedItems,
    removedItems,
    modifiedItems,
    controlChanges,
    substituteChangeCount,
  }
}
