import { DEFAULT_BOM_SECTION_CODE, LEGACY_BOM_SECTION_CODE_MAP, BOM_SECTION_SEED_CONFIGS } from '../constants/bom-sections'
import { type BOMSectionOption } from '../data/bom-section-schema'

function normalizeSectionToken(value?: string | null) {
  return (value || '').replace(/\s+/g, '').trim().toUpperCase()
}

function createSeedSectionOptions(): BOMSectionOption[] {
  return BOM_SECTION_SEED_CONFIGS.map((section) => ({
    value: section.code,
    label: section.name,
    code: section.code,
    name: section.name,
    active: section.active,
    sortOrder: section.sortOrder,
    isDefault: section.isDefault,
    legacyNames: [...section.legacyNames],
  }))
}

function withFallbackSections(sections: BOMSectionOption[]) {
  return sections.length > 0 ? sections : createSeedSectionOptions()
}

export function getSortedBOMSections(sections: BOMSectionOption[]) {
  return [...withFallbackSections(sections)].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.code.localeCompare(b.code)
  })
}

export function getActiveBOMSections(sections: BOMSectionOption[]) {
  const sorted = getSortedBOMSections(sections)
  return sorted.filter((section) => section.active)
}

export function getDefaultBOMSectionCode(sections: BOMSectionOption[]) {
  const sorted = getSortedBOMSections(sections)
  return (
    sorted.find((section) => section.active && section.isDefault)?.code
    ?? sorted.find((section) => section.active)?.code
    ?? (sections.length === 0 ? DEFAULT_BOM_SECTION_CODE : '')
  )
}

export function resolveBOMSection(sections: BOMSectionOption[], rawValue?: string | null) {
  const normalizedValue = normalizeSectionToken(rawValue)
  if (!normalizedValue) return undefined

  const candidates = withFallbackSections(sections)

  const matched = candidates.find((section) => {
    if (normalizeSectionToken(section.code) === normalizedValue) return true
    if (normalizeSectionToken(section.name) === normalizedValue) return true
    if (normalizeSectionToken(section.value) === normalizedValue) return true
    if (normalizeSectionToken(section.label) === normalizedValue) return true
    return section.legacyNames.some((legacyName) => normalizeSectionToken(legacyName) === normalizedValue)
  })

  if (matched) return matched

  const fallbackCode = LEGACY_BOM_SECTION_CODE_MAP[rawValue || '']
  if (!fallbackCode) return undefined
  return candidates.find((section) => section.code === fallbackCode)
}

export function normalizeBOMSectionValue(sections: BOMSectionOption[], rawValue?: string | null) {
  return resolveBOMSection(sections, rawValue)?.code ?? rawValue?.trim() ?? ''
}

export function resolveBOMSectionLabel(sections: BOMSectionOption[], rawValue?: string | null, fallback = '') {
  return resolveBOMSection(sections, rawValue)?.name ?? rawValue?.trim() ?? fallback
}

export function buildBOMSectionDisplayNames(sections: BOMSectionOption[]) {
  const activeSections = getActiveBOMSections(sections)
  if (activeSections.length > 0) {
    return activeSections.map((section) => section.name)
  }
  return sections.length === 0 ? BOM_SECTION_SEED_CONFIGS.map((section) => section.name) : []
}
