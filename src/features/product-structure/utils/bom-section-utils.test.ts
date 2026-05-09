import { describe, expect, it } from 'vitest'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { buildBOMSectionDisplayNames, getActiveBOMSections, getDefaultBOMSectionCode } from './bom-section-utils'

const inactiveSections: BOMSectionOption[] = [
  {
    value: 'PREPARE',
    label: '备料',
    code: 'PREPARE',
    name: '备料',
    active: false,
    sortOrder: 1,
    isDefault: true,
    legacyNames: ['备料'],
  },
  {
    value: 'ROLLING',
    label: '卷料',
    code: 'ROLLING',
    name: '卷料',
    active: false,
    sortOrder: 2,
    isDefault: false,
    legacyNames: ['卷料'],
  },
]

describe('bom-section-utils', () => {
  it('returns no active sections when real config exists but all sections are inactive', () => {
    expect(getActiveBOMSections(inactiveSections)).toEqual([])
    expect(buildBOMSectionDisplayNames(inactiveSections)).toEqual([])
  })

  it('returns empty default code when real config exists but no active section is available', () => {
    expect(getDefaultBOMSectionCode(inactiveSections)).toBe('')
  })

  it('still falls back to the seed default only when no section config exists yet', () => {
    expect(getDefaultBOMSectionCode([])).toBe('PREPARE')
    expect(buildBOMSectionDisplayNames([])).not.toEqual([])
  })
})
