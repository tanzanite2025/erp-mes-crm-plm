import type { AuditLog, DiffItem } from '../types'

export interface ProductAuditBasicChange {
  field: string
  alias: string
  before: unknown
  after: unknown
}

export interface ProductAuditStructuredChange {
  field: string
  alias: string
  before: unknown
  after: unknown
  beforeCount: number
  afterCount: number
  beforePreview: string[]
  afterPreview: string[]
}

export interface ProductAuditSummary {
  targetName: string
  targetSku: string
  targetTypeId: string
  basicChanges: ProductAuditBasicChange[]
  structuredChanges: ProductAuditStructuredChange[]
  totalChanges: number
}

export interface ProductAuditResolvedDiffRow {
  key: string
  before: string
  after: string
}

const PRODUCT_AUDIT_VISIBLE_BASIC_FIELDS = new Set([
  'sku',
  'name',
  'modelcode',
  'typeid',
  'depth',
  'widthinternal',
  'widthexternal',
  'tiretype',
  'braketype',
  'techseries',
  'weight',
  'length',
  'angle',
  'clamp',
  'offset',
  'axlecrown',
  'steerer',
  'moldgroup',
  'description',
  'engineeringspecid',
  'status',
  'templatekey',
  'revisionno',
  'effectivefrom',
  'effectiveto',
  'changetype',
  'changeorderno',
  'sitecode',
  'isdefaultsite',
  'version',
])

const PRODUCT_AUDIT_STRUCTURED_FIELDS = new Set([
  'attributevalues',
  'techspecs',
  'barcodeconfig',
  'attachments',
  'restrictions',
])

const PRODUCT_AUDIT_HIDDEN_FIELDS = new Set([
  'basemodel',
  'id',
  'createdat',
  'updatedat',
  'resolvedtemplateid',
  'resolvedtemplatekey',
  'templateresolutionsource',
  'templateresolutionerror',
  'image',
])

const PRODUCT_AUDIT_HIDDEN_NESTED_KEYS = new Set([
  'id',
  'createdat',
  'updatedat',
  'productid',
  'version',
  'sortorder',
])

function normalizeAuditFieldName(field: string): string {
  return field.trim().replace(/[\s_-]/g, '').toLowerCase()
}

function isStructuredAuditValue(value: unknown): boolean {
  return Array.isArray(value) || (!!value && typeof value === 'object')
}

function isVisibleBasicField(field: string): boolean {
  const normalizedField = normalizeAuditFieldName(field)
  return PRODUCT_AUDIT_VISIBLE_BASIC_FIELDS.has(normalizedField) && !PRODUCT_AUDIT_HIDDEN_FIELDS.has(normalizedField)
}

function isHiddenField(field: string): boolean {
  return PRODUCT_AUDIT_HIDDEN_FIELDS.has(normalizeAuditFieldName(field))
}

function isStructuredField(field: string): boolean {
  return PRODUCT_AUDIT_STRUCTURED_FIELDS.has(normalizeAuditFieldName(field))
}

function normalizeStringValue(value: string): string {
  const trimmed = value.trim()
  return trimmed || '—'
}

export function formatProductAuditDisplayText(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }

  if (typeof value === 'string') {
    return normalizeStringValue(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatProductAuditDisplayText(item))
      .filter((item) => item !== '—')

    return items.length > 0 ? items.join(', ') : '—'
  }

  try {
    return JSON.stringify(value)
  } catch {
    return '—'
  }
}

function truncatePreviewText(value: string): string {
  return value.length > 64 ? `${value.slice(0, 61)}...` : value
}

function areDisplayValuesEqual(left: string, right: string): boolean {
  return left.trim() === right.trim()
}

function summarizeObjectEntry(key: string, value: unknown): string {
  return `${key}: ${truncatePreviewText(formatProductAuditDisplayText(value))}`
}

function summarizeArrayEntry(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return truncatePreviewText(formatProductAuditDisplayText(value))
  }

  const record = value as Record<string, unknown>

  if (typeof record.categoryKey === 'string' || typeof record.optionValue === 'string') {
    return truncatePreviewText(`${formatProductAuditDisplayText(record.categoryKey)}: ${formatProductAuditDisplayText(record.optionValue)}`)
  }

  if (typeof record.name === 'string') {
    return truncatePreviewText(record.name.trim() || formatProductAuditDisplayText(record.id))
  }

  if (typeof record.label === 'string') {
    return truncatePreviewText(record.label.trim() || formatProductAuditDisplayText(record.id))
  }

  if (typeof record.id === 'string') {
    return truncatePreviewText(record.id.trim())
  }

  const entries = Object.entries(record).slice(0, 2)
  if (entries.length === 0) {
    return '—'
  }

  return truncatePreviewText(entries.map(([key, itemValue]) => summarizeObjectEntry(key, itemValue)).join(' · '))
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => formatProductAuditDisplayText(item))
    .map((item) => item.trim())
    .filter((item) => item && item !== '—')
}

type ProductAuditAttributeValueRecord = {
  categoryKey: string
  optionValue: string
}

function toProductAttributeValueRecords(value: unknown): ProductAuditAttributeValueRecord[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return []
    }

    const record = item as Record<string, unknown>
    const categoryKey = typeof record.categoryKey === 'string' ? record.categoryKey.trim() : ''
    const optionValue = typeof record.optionValue === 'string' ? record.optionValue.trim() : ''

    if (!categoryKey) {
      return []
    }

    return [{
      categoryKey,
      optionValue,
    }]
  })
}

function toAttributeValueMap(value: unknown): Map<string, string> {
  return new Map(toProductAttributeValueRecords(value).map((item) => [item.categoryKey, item.optionValue]))
}

function toAttachmentNames(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return formatProductAuditDisplayText(item)
      }

      const record = item as Record<string, unknown>
      if (typeof record.name === 'string' && record.name.trim()) {
        return record.name.trim()
      }

      return formatProductAuditDisplayText(record.id)
    })
    .map((item) => item.trim())
    .filter((item) => item && item !== '—')
}

function summarizeStructuredValue(value: unknown): { count: number; preview: string[] } {
  if (value === null || value === undefined) {
    return { count: 0, preview: ['—'] }
  }

  if (Array.isArray(value)) {
    const preview = value.slice(0, 3).map((item) => summarizeArrayEntry(item)).filter(Boolean)
    return {
      count: value.length,
      preview: preview.length > 0 ? preview : ['—'],
    }
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    const preview = entries.slice(0, 3).map(([key, itemValue]) => summarizeObjectEntry(key, itemValue))
    return {
      count: entries.length,
      preview: preview.length > 0 ? preview : ['—'],
    }
  }

  const normalized = truncatePreviewText(formatProductAuditDisplayText(value))
  return {
    count: normalized === '—' ? 0 : 1,
    preview: [normalized],
  }
}

export function buildProductAttributeValueDiffRows(change: ProductAuditStructuredChange): ProductAuditResolvedDiffRow[] {
  const beforeMap = toAttributeValueMap(change.before)
  const afterMap = toAttributeValueMap(change.after)
  const categoryKeys = Array.from(new Set([...beforeMap.keys(), ...afterMap.keys()])).sort((left, right) => left.localeCompare(right))

  return categoryKeys
    .map((categoryKey) => ({
      key: categoryKey,
      before: beforeMap.get(categoryKey) || '—',
      after: afterMap.get(categoryKey) || '—',
    }))
    .filter((item) => !areDisplayValuesEqual(item.before, item.after))
}

function buildProductRestrictionsDiffRows(change: ProductAuditStructuredChange): ProductAuditResolvedDiffRow[] {
  const before = toStringArray(change.before).join(', ') || '—'
  const after = toStringArray(change.after).join(', ') || '—'

  return areDisplayValuesEqual(before, after)
    ? []
    : [{
        key: 'restrictions',
        before,
        after,
      }]
}

function buildProductAttachmentDiffRows(change: ProductAuditStructuredChange): ProductAuditResolvedDiffRow[] {
  const before = toAttachmentNames(change.before).join(', ') || '—'
  const after = toAttachmentNames(change.after).join(', ') || '—'

  return areDisplayValuesEqual(before, after)
    ? []
    : [{
        key: 'attachments',
        before,
        after,
      }]
}

function buildProductObjectDiffRows(change: ProductAuditStructuredChange): ProductAuditResolvedDiffRow[] {
  const beforeRecord = toRecord(change.before)
  const afterRecord = toRecord(change.after)
  const keys = Array.from(new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]))
    .filter((key) => !PRODUCT_AUDIT_HIDDEN_NESTED_KEYS.has(normalizeAuditFieldName(key)))
    .sort((left, right) => left.localeCompare(right))

  return keys
    .map((key) => ({
      key,
      before: formatProductAuditDisplayText(beforeRecord[key]),
      after: formatProductAuditDisplayText(afterRecord[key]),
    }))
    .filter((item) => !areDisplayValuesEqual(item.before, item.after))
}

export function buildProductStructuredDiffRows(change: ProductAuditStructuredChange): ProductAuditResolvedDiffRow[] {
  const normalizedField = normalizeAuditFieldName(change.field)

  if (normalizedField === 'attributevalues') {
    return buildProductAttributeValueDiffRows(change)
  }

  if (normalizedField === 'attachments') {
    return buildProductAttachmentDiffRows(change)
  }

  if (normalizedField === 'restrictions') {
    return buildProductRestrictionsDiffRows(change)
  }

  return buildProductObjectDiffRows(change)
}

function resolveTargetText(diff: DiffItem[], field: string): string {
  const normalizedField = normalizeAuditFieldName(field)
  const matchingItems = diff.filter((item) => normalizeAuditFieldName(item.f || item.a || '') === normalizedField)

  for (let index = matchingItems.length - 1; index >= 0; index -= 1) {
    const candidate = matchingItems[index]
    const afterText = formatProductAuditDisplayText(candidate.n)
    if (afterText !== '—') {
      return afterText
    }

    const beforeText = formatProductAuditDisplayText(candidate.o)
    if (beforeText !== '—') {
      return beforeText
    }
  }

  return ''
}

export function buildProductAuditSummary(log: AuditLog): ProductAuditSummary {
  const diff = Array.isArray(log.diff) ? log.diff : []
  const basicChanges: ProductAuditBasicChange[] = []
  const structuredChanges: ProductAuditStructuredChange[] = []

  diff.forEach((item) => {
    const alias = item.a?.trim() || item.f?.trim() || 'unknown'
    const field = item.f?.trim() || alias
    if (isHiddenField(field)) {
      return
    }

    const structured = isStructuredField(field) || isStructuredAuditValue(item.o) || isStructuredAuditValue(item.n)

    if (structured) {
      const beforeSummary = summarizeStructuredValue(item.o)
      const afterSummary = summarizeStructuredValue(item.n)
      structuredChanges.push({
        field,
        alias,
        before: item.o,
        after: item.n,
        beforeCount: beforeSummary.count,
        afterCount: afterSummary.count,
        beforePreview: beforeSummary.preview,
        afterPreview: afterSummary.preview,
      })
      return
    }

    if (!isVisibleBasicField(field)) {
      return
    }

    basicChanges.push({
      field,
      alias,
      before: item.o,
      after: item.n,
    })
  })

  return {
    targetName: resolveTargetText(diff, 'name'),
    targetSku: resolveTargetText(diff, 'sku'),
    targetTypeId: resolveTargetText(diff, 'typeId'),
    basicChanges,
    structuredChanges,
    totalChanges: basicChanges.length + structuredChanges.length,
  }
}
