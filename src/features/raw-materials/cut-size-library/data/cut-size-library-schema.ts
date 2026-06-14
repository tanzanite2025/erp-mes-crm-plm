import { resolveSupportedCutAngleValue } from '../../utils/cut-orientation'
import {
  deriveCutSizeAreaM2,
  deriveCutSizeWeightG,
} from '../domain/cut-size-geometry'

export type CutSizeUnitStatus = 'Active' | 'Inactive' | 'Archived'

export interface CutSizeUnit {
  id: string
  code: string
  name: string
  widthMm: string
  lengthMm: string
  pieceCount: string
  areaM2: string
  areaWeightGsm: string
  weightG: string
  cutAngle: string
  layupCount: string
  layupMode: string
  usageType: string
  notes: string
  status: CutSizeUnitStatus
  version: number
  createdAt?: string
  updatedAt?: string
}

export type CutSizeUnitFormState = Omit<
  CutSizeUnit,
  'id' | 'version' | 'createdAt' | 'updatedAt'
>

export const EMPTY_CUT_SIZE_UNIT_FORM: CutSizeUnitFormState = {
  code: '',
  name: '',
  widthMm: '',
  lengthMm: '',
  pieceCount: '1',
  areaM2: '',
  areaWeightGsm: '',
  weightG: '',
  cutAngle: '0',
  layupCount: '1',
  layupMode: '',
  usageType: '',
  notes: '',
  status: 'Active',
}

function normalizeStatus(raw: unknown): CutSizeUnitStatus {
  const value = String(raw || '').trim()
  if (value === 'Inactive' || value === 'Archived') return value
  return 'Active'
}

export function normalizeCutSizeUnit(item: Partial<CutSizeUnit>): CutSizeUnit {
  return {
    id: item.id || '',
    code: item.code || '',
    name: item.name || '',
    widthMm: item.widthMm || '',
    lengthMm: item.lengthMm || '',
    pieceCount: item.pieceCount || '1',
    areaM2: item.areaM2 || '',
    areaWeightGsm: item.areaWeightGsm || '',
    weightG: item.weightG || '',
    cutAngle: resolveSupportedCutAngleValue(item.cutAngle),
    layupCount: item.layupCount || '1',
    layupMode: item.layupMode || '',
    usageType: item.usageType || '',
    notes: item.notes || '',
    status: normalizeStatus(item.status),
    version: Number(item.version || 1) || 1,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

export function formFromCutSizeUnit(
  unit: CutSizeUnit | null
): CutSizeUnitFormState {
  if (!unit) return EMPTY_CUT_SIZE_UNIT_FORM
  return {
    code: unit.code || '',
    name: unit.name || '',
    widthMm: unit.widthMm || '',
    lengthMm: unit.lengthMm || '',
    pieceCount: unit.pieceCount || '1',
    areaM2: unit.areaM2 || '',
    areaWeightGsm: unit.areaWeightGsm || '',
    weightG: unit.weightG || '',
    cutAngle: resolveSupportedCutAngleValue(unit.cutAngle),
    layupCount: unit.layupCount || '1',
    layupMode: unit.layupMode || '',
    usageType: unit.usageType || '',
    notes: unit.notes || '',
    status: unit.status,
  }
}

export function buildCutSizeUnitPayload(
  form: CutSizeUnitFormState,
  editing: CutSizeUnit | null
): Partial<CutSizeUnit> {
  const areaM2 = deriveCutSizeAreaM2(form)
  const weightG = deriveCutSizeWeightG({
    widthMm: form.widthMm,
    lengthMm: form.lengthMm,
    pieceCount: form.pieceCount,
    areaM2,
    areaWeightGsm: form.areaWeightGsm,
  })

  return {
    id: editing?.id || undefined,
    code: form.code.trim(),
    name: form.name.trim(),
    widthMm: form.widthMm.trim(),
    lengthMm: form.lengthMm.trim(),
    pieceCount: form.pieceCount.trim() || '1',
    areaM2,
    areaWeightGsm: form.areaWeightGsm.trim(),
    weightG,
    cutAngle: resolveSupportedCutAngleValue(form.cutAngle),
    layupCount: form.layupCount.trim() || '1',
    layupMode: form.layupMode.trim(),
    usageType: form.usageType.trim(),
    notes: form.notes.trim(),
    status: form.status,
    version: editing?.version || 1,
  }
}
