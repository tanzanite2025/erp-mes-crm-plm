import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import { type BOMItemDraft } from '../mutation-types'
import {
  getDefaultBOMSectionCode,
  normalizeBOMSectionValue,
} from './bom-section-utils'
import {
  normalizeBOMControlFieldPatch,
  normalizeEngineeringBomChangeType,
  normalizeEngineeringBomStatus,
  normalizeEngineeringBomVersion,
  normalizeEngineeringRevisionNo,
} from './bom-control-normalization'

function normalizeDraftItems(items?: BOMItemDraft[], sections: BOMSectionOption[] = []): BOM['items'] {
  const defaultSectionCode = getDefaultBOMSectionCode(sections)
  return (items || []).map((item) => ({
    ...item,
    section: normalizeBOMSectionValue(sections, item.section || defaultSectionCode),
  })) as BOM['items']
}

export function createEmptyBOMItem(sectionCode: string): BOM['items'][number] {
  return {
    id: '',
    section: sectionCode,
    materialId: '',
    materialName: '',
    materialSpec: '',
    unitPrice: 0,
    unit: '',
    unitUsage: 0,
    wastagePercent: 0,
    standardUsage: 0,
    materialType: '',
    supplyChannel: '',
    sortOrder: 0,
  }
}

export function createEmptyBOMFormValue(overrides: Partial<BOM> = {}, _sections: BOMSectionOption[] = []): BOM {
  return normalizeBOMControlFieldPatch({
    id: '',
    bomNo: '',
    bomType: 'EBOM',
    productId: '',
    bomVersion: normalizeEngineeringBomVersion('V1.0'),
    revisionNo: normalizeEngineeringRevisionNo('R1'),
    changeType: normalizeEngineeringBomChangeType('MANUAL'),
    status: normalizeEngineeringBomStatus('DRAFT'),
    isLocked: false,
    measuredWeight: 0,
    measuredWeightUnit: '',
    items: [],
    description: '',
    version: 1,
    ...overrides,
  }) as BOM
}

export function createBOMFormValue(params: {
  currentRow?: BOM
  initialItems?: BOMItemDraft[]
  initialProductId?: string
  sections: BOMSectionOption[]
  isEdit: boolean
}): BOM {
  const { currentRow, initialItems, initialProductId, sections, isEdit } = params

  if (isEdit && currentRow) {
    return createEmptyBOMFormValue({
      ...currentRow,
      items: normalizeDraftItems(currentRow.items, sections),
    }, sections)
  }

  return createEmptyBOMFormValue({
    productId: initialProductId || '',
    items: normalizeDraftItems(initialItems, sections),
  }, sections)
}
