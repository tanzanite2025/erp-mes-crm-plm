export type PrepregMaterialSpecStatus = 'Active' | 'Inactive' | 'Archived'

export interface PrepregMaterialSpec {
  id: string
  code: string
  name: string
  supplierProductCode: string
  fiberModel: string
  resinContentPercent: string
  widthMm: string
  areaWeightGsm: string
  nominalAreaM2: string
  supplierBatchNo: string
  rollNo: string
  productionDate: string
  storageRequirement: string
  description: string
  status: PrepregMaterialSpecStatus
  version: number
  createdAt?: string
  updatedAt?: string
}

export interface PrepregMaterialSpecListResponse {
  items: PrepregMaterialSpec[]
  total: number
  page: number
  pageSize: number
}

export type PrepregFormState = {
  code: string
  name: string
  supplierProductCode: string
  fiberModel: string
  resinContentPercent: string
  widthMm: string
  areaWeightGsm: string
  nominalAreaM2: string
  supplierBatchNo: string
  rollNo: string
  productionDate: string
  storageRequirement: string
  status: PrepregMaterialSpecStatus
  description: string
}

export const EMPTY_PREPREG_FORM: PrepregFormState = {
  code: '',
  name: '',
  supplierProductCode: '',
  fiberModel: '',
  resinContentPercent: '',
  widthMm: '',
  areaWeightGsm: '',
  nominalAreaM2: '',
  supplierBatchNo: '',
  rollNo: '',
  productionDate: '',
  storageRequirement: '',
  status: 'Active',
  description: '',
}

export function normalizePrepregSpec(item: Partial<PrepregMaterialSpec>): PrepregMaterialSpec {
  return {
    id: item.id || '',
    code: item.code || '',
    name: item.name || '',
    supplierProductCode: item.supplierProductCode || '',
    fiberModel: item.fiberModel || '',
    resinContentPercent: item.resinContentPercent || '',
    widthMm: item.widthMm || '',
    areaWeightGsm: item.areaWeightGsm || '',
    nominalAreaM2: item.nominalAreaM2 || '',
    supplierBatchNo: item.supplierBatchNo || '',
    rollNo: item.rollNo || '',
    productionDate: item.productionDate || '',
    storageRequirement: item.storageRequirement || '',
    description: item.description || '',
    status: item.status || 'Active',
    version: item.version || 1,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

export function formFromPrepregSpec(spec: PrepregMaterialSpec | null): PrepregFormState {
  if (!spec) return EMPTY_PREPREG_FORM
  return {
    code: spec.code || '',
    name: spec.name || '',
    supplierProductCode: spec.supplierProductCode || '',
    fiberModel: spec.fiberModel || '',
    resinContentPercent: spec.resinContentPercent || '',
    widthMm: spec.widthMm || '',
    areaWeightGsm: spec.areaWeightGsm || '',
    nominalAreaM2: spec.nominalAreaM2 || '',
    supplierBatchNo: spec.supplierBatchNo || '',
    rollNo: spec.rollNo || '',
    productionDate: spec.productionDate || '',
    storageRequirement: spec.storageRequirement || '',
    status: spec.status,
    description: spec.description || '',
  }
}

export function buildPrepregSpecPayload(
  form: PrepregFormState,
  editing: PrepregMaterialSpec | null
): Partial<PrepregMaterialSpec> {
  return {
    id: editing?.id || undefined,
    code: form.code.trim(),
    name: form.name.trim(),
    supplierProductCode: form.supplierProductCode.trim(),
    fiberModel: form.fiberModel.trim(),
    resinContentPercent: form.resinContentPercent.trim(),
    widthMm: form.widthMm.trim(),
    areaWeightGsm: form.areaWeightGsm.trim(),
    nominalAreaM2: form.nominalAreaM2.trim(),
    supplierBatchNo: form.supplierBatchNo.trim(),
    rollNo: form.rollNo.trim(),
    productionDate: form.productionDate.trim(),
    storageRequirement: form.storageRequirement.trim(),
    description: form.description.trim(),
    status: form.status,
    version: editing?.version,
  }
}

export function prepregSpecSummary(spec: PrepregMaterialSpec): string {
  return [
    spec.supplierProductCode,
    spec.resinContentPercent ? `${spec.resinContentPercent}%` : '',
    spec.areaWeightGsm ? `${spec.areaWeightGsm}g/m2` : '',
    spec.widthMm ? `${spec.widthMm}mm` : '',
  ].filter(Boolean).join(' / ')
}

export function mergePrepregRecognizedFields(
  current: PrepregFormState,
  fields: Partial<PrepregFormState>
): PrepregFormState {
  return Object.entries(fields).reduce<PrepregFormState>((next, [key, value]) => {
    if (typeof value !== 'string' || !value.trim()) return next
    return { ...next, [key]: value.trim() }
  }, current)
}
