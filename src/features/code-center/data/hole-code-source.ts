export type HoleCodePrefix = string

interface HoleCodeSourceBaseItem {
  id: string
  label: string
  description: string
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  version: number
}

export interface HoleCodePrefixItem extends HoleCodeSourceBaseItem {
  code: HoleCodePrefix
}

export interface HoleCodeCountItem extends HoleCodeSourceBaseItem {
  value: string
}

export interface HoleCodePrefixDraft {
  id?: string
  code: HoleCodePrefix
  label: string
  description?: string
  active: boolean
  sortOrder: number
  version?: number
}

export interface HoleCodeCountDraft {
  id?: string
  value: string
  label: string
  description?: string
  active: boolean
  sortOrder: number
  version?: number
}

export interface HoleCodeSourceBundle {
  prefixes: HoleCodePrefixItem[]
  counts: HoleCodeCountItem[]
}

export const SHARED_HOLE_CODE_SOURCE_STORAGE_KEY = 'code_center_shared_hole_codes_v1'
export const SHARED_HOLE_CODE_SOURCE_QUERY_KEY = ['code-center', 'shared-code-source', 'hole-codes'] as const

const DEFAULT_HOLE_COUNTS = ['14', '16', '18', '20', '21', '24', '28', '32'] as const
const DEFAULT_PREFIXES: HoleCodePrefix[] = ['R', 'D']

export function createEmptyHoleCodeSourceBundle(): HoleCodeSourceBundle {
  return {
    prefixes: [],
    counts: [],
  }
}

export function createDefaultHoleCodeSources(): HoleCodeSourceBundle {
  const now = new Date().toISOString()

  return {
    prefixes: DEFAULT_PREFIXES.map((code, index) => ({
      id: `hole_prefix_${code}`,
      code,
      label: code,
      description: '',
      active: true,
      sortOrder: index + 1,
      createdAt: now,
      updatedAt: now,
      version: 1,
    })),
    counts: DEFAULT_HOLE_COUNTS.map((value, index) => ({
      id: `hole_count_${value}`,
      value,
      label: value,
      description: '',
      active: true,
      sortOrder: index + 1,
      createdAt: now,
      updatedAt: now,
      version: 1,
    })),
  }
}

export function getActiveHoleCodePrefixes(bundle: HoleCodeSourceBundle) {
  return bundle.prefixes.filter((item) => item.active)
}

export function getActiveHoleCodeCounts(bundle: HoleCodeSourceBundle) {
  return bundle.counts.filter((item) => item.active)
}

export function getHoleCodePrefixOptions(items: HoleCodePrefixItem[]) {
  return items.map((item) => item.code)
}

export function getHoleCodeCountOptions(items: HoleCodeCountItem[]) {
  return items.map((item) => item.value)
}

export function buildHolePrefixLabelMap(items: HoleCodePrefixItem[]) {
  return items.reduce<Record<string, string>>((accumulator, item) => {
    accumulator[item.code] = item.label || item.code
    return accumulator
  }, {})
}

export function buildHoleCountLabelMap(items: HoleCodeCountItem[]) {
  return items.reduce<Record<string, string>>((accumulator, item) => {
    accumulator[item.value] = item.label || item.value
    return accumulator
  }, {})
}

export function buildHoleCodeCombinationLabelMap(prefixes: HoleCodePrefixItem[], counts: HoleCodeCountItem[]) {
  return prefixes.reduce<Record<string, string>>((accumulator, prefix) => {
    counts.forEach((count) => {
      accumulator[`${prefix.code}${count.value}`] = `${prefix.label || prefix.code}${count.label || count.value}`
    })
    return accumulator
  }, {})
}
