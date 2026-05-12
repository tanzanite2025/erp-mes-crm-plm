import { describe, expect, it } from 'vitest'
import { type MaterialOption } from '../../material-archive/data/schema'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOMItemDraft } from '../mutation-types'
import { ExcelService } from './excel-service'

const sections: BOMSectionOption[] = [
  {
    value: 'MACHINING',
    label: '机加',
    code: 'MACHINING',
    name: '机加',
    active: true,
    sortOrder: 1,
    isDefault: true,
    legacyNames: [],
  },
]

const materials: MaterialOption[] = [
  {
    id: 'mat-1',
    code: 'MAT-001',
    name: '钢管',
    category: 'RAW_MATERIAL',
    spec: 'Φ10',
    uom: 'PCS',
    status: 'Active',
    costPrice: 12.5,
  },
]

describe('ExcelService.normalizeParsedBOMItems', () => {
  it('applies material defaults and computes standard usage for imported BOM rows', () => {
    const parsedItems: BOMItemDraft[] = [
      {
        id: 'row-1',
        section: '机加',
        materialId: 'mat-1',
        materialType: '手工指定',
        unitUsage: 2,
        wastagePercent: 5,
      },
    ]

    const result = ExcelService.normalizeParsedBOMItems({
      parsedItems,
      materials,
      sections,
    })

    expect(result.errors).toEqual([])
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({
      section: 'MACHINING',
      materialId: 'mat-1',
      materialName: '钢管',
      materialSpec: 'Φ10',
      unitPrice: 12.5,
      unit: 'PCS',
      unitUsage: 2,
      wastagePercent: 5,
      materialType: '手工指定',
    })
    expect(result.items[0].standardUsage).toBeCloseTo(2.1)
  })

  it('preserves an explicitly entered zero unit price', () => {
    const parsedItems: BOMItemDraft[] = [
      {
        id: 'row-2',
        section: 'MACHINING',
        materialId: 'mat-1',
        unitPrice: 0,
        unitUsage: 1,
        wastagePercent: 0,
      },
    ]

    const result = ExcelService.normalizeParsedBOMItems({
      parsedItems,
      materials,
      sections,
    })

    expect(result.errors).toEqual([])
    expect(result.items).toHaveLength(1)
    expect(result.items[0].unitPrice).toBe(0)
    expect(result.items[0].standardUsage).toBe(1)
  })

  it('reports rows whose materials no longer exist in the current archive', () => {
    const parsedItems: BOMItemDraft[] = [
      {
        id: 'row-3',
        section: 'MACHINING',
        materialId: 'missing-mat',
        unitUsage: 1,
        wastagePercent: 0,
      },
    ]

    const result = ExcelService.normalizeParsedBOMItems({
      parsedItems,
      materials,
      sections,
    })

    expect(result.items).toEqual([])
    expect(result.errors).toEqual([
      'Row 2: materialId: Material missing-mat was not found in current material archive',
    ])
  })
})
