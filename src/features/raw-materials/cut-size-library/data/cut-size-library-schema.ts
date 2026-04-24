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
  edgeTrimMm: string
  stepOffsetMm: string
  lossFactor: string
  notes: string
  status: CutSizeUnitStatus
  version: number
  createdAt?: string
  updatedAt?: string
}

export type CutSizeUnitFormState = Omit<CutSizeUnit, 'id' | 'version' | 'createdAt' | 'updatedAt'>

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
  edgeTrimMm: '',
  stepOffsetMm: '',
  lossFactor: '',
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
    cutAngle: item.cutAngle || '0',
    layupCount: item.layupCount || '1',
    layupMode: item.layupMode || '',
    usageType: item.usageType || '',
    edgeTrimMm: item.edgeTrimMm || '',
    stepOffsetMm: item.stepOffsetMm || '',
    lossFactor: item.lossFactor || '',
    notes: item.notes || '',
    status: normalizeStatus(item.status),
    version: Number(item.version || 1) || 1,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

export function formFromCutSizeUnit(unit: CutSizeUnit | null): CutSizeUnitFormState {
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
    cutAngle: unit.cutAngle || '0',
    layupCount: unit.layupCount || '1',
    layupMode: unit.layupMode || '',
    usageType: unit.usageType || '',
    edgeTrimMm: unit.edgeTrimMm || '',
    stepOffsetMm: unit.stepOffsetMm || '',
    lossFactor: unit.lossFactor || '',
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
    cutAngle: form.cutAngle.trim() || '0',
    layupCount: form.layupCount.trim() || '1',
    layupMode: form.layupMode.trim(),
    usageType: form.usageType.trim(),
    edgeTrimMm: form.edgeTrimMm.trim(),
    stepOffsetMm: form.stepOffsetMm.trim(),
    lossFactor: form.lossFactor.trim(),
    notes: form.notes.trim(),
    status: form.status,
    version: editing?.version || 1,
  }
}

export function formatCutSizeExpression(
  unit: Pick<CutSizeUnit, 'widthMm' | 'lengthMm' | 'pieceCount'>
): string {
  const width = unit.widthMm.trim()
  const length = unit.lengthMm.trim()
  const count = unit.pieceCount.trim() || '1'
  if (!width || !length) return ''
  return `${width}x${length}x${count}`
}

export function toPositiveNumber(value?: string): number {
  const parsed = Number.parseFloat((value || '').trim())
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return parsed
}

function normalizeDecimalString(value: number, fractionDigits = 6): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  return value.toFixed(fractionDigits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '').replace(/\.$/, '')
}

export function deriveCutSizeAreaM2(
  unit: Pick<CutSizeUnitFormState, 'widthMm' | 'lengthMm' | 'pieceCount'>
): string {
  const widthMm = toPositiveNumber(unit.widthMm)
  const lengthMm = toPositiveNumber(unit.lengthMm)
  const pieceCount = toPositiveNumber(unit.pieceCount || '1')
  if (!widthMm || !lengthMm || !pieceCount) return ''

  const areaM2 = (widthMm * lengthMm * pieceCount) / 1000000
  return normalizeDecimalString(areaM2)
}

export function resolveCutSizeAreaM2(
  unit: Pick<CutSizeUnit, 'areaM2' | 'widthMm' | 'lengthMm' | 'pieceCount'>
): string {
  return deriveCutSizeAreaM2(unit) || unit.areaM2.trim()
}

export function deriveCutSizeWeightG(
  unit: Pick<CutSizeUnitFormState, 'widthMm' | 'lengthMm' | 'pieceCount' | 'areaM2' | 'areaWeightGsm'>
): string {
  const areaM2 = toPositiveNumber(unit.areaM2) || toPositiveNumber(deriveCutSizeAreaM2(unit))
  const areaWeightGsm = toPositiveNumber(unit.areaWeightGsm)
  if (!areaM2 || !areaWeightGsm) return ''

  const weightG = areaM2 * areaWeightGsm
  return normalizeDecimalString(weightG, 3)
}

export function resolveCutSizeWeightG(
  unit: Pick<CutSizeUnit, 'weightG' | 'areaM2' | 'areaWeightGsm' | 'widthMm' | 'lengthMm' | 'pieceCount'>
): string {
  return deriveCutSizeWeightG(unit) || unit.weightG.trim()
}
