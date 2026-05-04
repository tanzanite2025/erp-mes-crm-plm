import { type BOM } from '../data/schema'
import { type BOMItemDraft } from '../mutation-types'
import {
  normalizeBOMControlFieldPatch,
  normalizeEngineeringBomChangeType,
  normalizeEngineeringBomStatus,
  normalizeEngineeringBomVersion,
  normalizeEngineeringRevisionNo,
} from './product-code-normalization'

function normalizeDraftItems(items?: BOMItemDraft[]): BOM['items'] {
  return (items || []).map((item) => ({
    ...item,
    substitutes: item.substitutes || [],
  })) as BOM['items']
}

export function createEmptyBOMFormValue(overrides: Partial<BOM> = {}): BOM {
  return normalizeBOMControlFieldPatch({
    id: '',
    bomNo: '',
    productId: '',
    bomVersion: normalizeEngineeringBomVersion('V1.0'),
    revisionNo: normalizeEngineeringRevisionNo('R1'),
    changeType: normalizeEngineeringBomChangeType('MANUAL'),
    isDefaultSite: true,
    status: normalizeEngineeringBomStatus('active'),
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
  isEdit: boolean
}): BOM {
  const { currentRow, initialItems, initialProductId, isEdit } = params

  if (isEdit && currentRow) {
    return createEmptyBOMFormValue({
      ...currentRow,
      isDefaultSite: currentRow.isDefaultSite ?? !currentRow.siteCode,
      items: normalizeDraftItems(currentRow.items),
    })
  }

  return createEmptyBOMFormValue({
    productId: initialProductId || '',
    items: normalizeDraftItems(initialItems),
  })
}
