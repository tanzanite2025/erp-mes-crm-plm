export type PrepregMaterialSpecStatus = 'Active' | 'Inactive' | 'Archived'

export interface PrepregMaterialSpec {
  id: string
  code: string
  name: string
  displayAlias: string
  supplierId: string
  supplierProductCode: string
  fiberModel: string
  resinContentPercent: string
  widthMm: string
  lengthM: string
  nominalAreaM2: string
  supplierBatchNo: string
  inspector: string
  boxNo: string
  productionDate: string
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
  displayAlias: string
  supplierId: string
  supplierProductCode: string
  fiberModel: string
  resinContentBatchRaw: string
  widthMm: string
  nominalAreaM2: string
  inspector: string
  boxNo: string
  productionDate: string
  status: PrepregMaterialSpecStatus
  description: string
}

export const EMPTY_PREPREG_FORM: PrepregFormState = {
  code: '',
  name: '',
  displayAlias: '',
  supplierId: '',
  supplierProductCode: '',
  fiberModel: '',
  resinContentBatchRaw: '',
  widthMm: '',
  nominalAreaM2: '',
  inspector: '',
  boxNo: '',
  productionDate: '',
  status: 'Active',
  description: '',
}

export function normalizePrepregSpec(
  item: Partial<PrepregMaterialSpec>
): PrepregMaterialSpec {
  return {
    id: item.id || '',
    code: item.code || '',
    name: item.name || '',
    displayAlias: item.displayAlias || '',
    supplierId: item.supplierId || '',
    supplierProductCode: item.supplierProductCode || '',
    fiberModel: item.fiberModel || '',
    resinContentPercent: item.resinContentPercent || '',
    widthMm: item.widthMm || '',
    lengthM: item.lengthM || '',
    nominalAreaM2: item.nominalAreaM2 || '',
    supplierBatchNo: item.supplierBatchNo || '',
    inspector: item.inspector || '',
    boxNo: item.boxNo || '',
    productionDate: item.productionDate || '',
    description: item.description || '',
    status: item.status || 'Active',
    version: item.version || 1,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

export function formFromPrepregSpec(
  spec: PrepregMaterialSpec | null
): PrepregFormState {
  if (!spec) return EMPTY_PREPREG_FORM
  return {
    code: spec.code || '',
    name: spec.name || '',
    displayAlias: spec.displayAlias || '',
    supplierId: spec.supplierId || '',
    supplierProductCode: spec.supplierProductCode || '',
    fiberModel: spec.fiberModel || '',
    resinContentBatchRaw: [
      spec.resinContentPercent ? `${spec.resinContentPercent}%` : '',
      spec.supplierBatchNo || '',
    ]
      .filter(Boolean)
      .join('/'),
    widthMm: spec.widthMm || '',
    nominalAreaM2: spec.nominalAreaM2 || '',
    inspector: spec.inspector || '',
    boxNo: spec.boxNo || '',
    productionDate: spec.productionDate || '',
    status: spec.status,
    description: spec.description || '',
  }
}

export function buildPrepregSpecPayload(
  form: PrepregFormState,
  editing: PrepregMaterialSpec | null
): Partial<PrepregMaterialSpec> {
  const cleanedDimensions = cleanPrepregDimensionFields({
    widthMm: form.widthMm,
    nominalAreaM2: form.nominalAreaM2,
    fallbackLengthM: editing?.lengthM || '',
  })
  const cleanedResinBatch = cleanPrepregResinBatchFields({
    resinContentBatchRaw: form.resinContentBatchRaw,
  })
  return {
    id: editing?.id || undefined,
    code: form.code.trim(),
    name: form.name.trim(),
    displayAlias: form.displayAlias.trim(),
    supplierId: form.supplierId.trim(),
    supplierProductCode: form.supplierProductCode.trim(),
    fiberModel: form.fiberModel.trim(),
    resinContentPercent: cleanedResinBatch.resinContentPercent,
    widthMm: cleanedDimensions.widthMm,
    lengthM: cleanedDimensions.lengthM,
    nominalAreaM2: cleanedDimensions.nominalAreaM2,
    supplierBatchNo: cleanedResinBatch.supplierBatchNo,
    inspector: form.inspector.trim(),
    boxNo: form.boxNo.trim(),
    productionDate: form.productionDate.trim(),
    description: form.description.trim(),
    status: form.status,
    version: editing?.version,
  }
}

export type PrepregResinBatchDerivation = 'manual' | 'split_from_raw'

export interface PrepregCleanedResinBatchFields {
  resinContentPercent: string
  supplierBatchNo: string
  derivation: PrepregResinBatchDerivation
  notes: string[]
}

function parseResinPercent(value: string): string {
  if (!/%/.test(value)) return ''
  const matched = value.match(/(\d+(?:\.\d+)?)/)
  if (!matched) return ''
  const parsed = Number.parseFloat(matched[1])
  if (!Number.isFinite(parsed) || parsed <= 0) return ''
  return Number.parseFloat(parsed.toFixed(3)).toString()
}

export function cleanPrepregResinBatchFields(source: {
  resinContentBatchRaw: string
}): PrepregCleanedResinBatchFields {
  const notes: string[] = []
  const raw = source.resinContentBatchRaw.trim().replace(/[／]/g, '/')

  if (!raw) {
    return {
      resinContentPercent: '',
      supplierBatchNo: '',
      derivation: 'manual',
      notes,
    }
  }

  const [left = '', right = ''] = raw.split('/').map((part) => part.trim())
  const resinContentPercent = parseResinPercent(left || raw)
  const supplierBatchNo = right || (!resinContentPercent ? raw : '')

  if (!resinContentPercent) {
    notes.push('rawMaterials.catalog.cleanedPreview.notes.resinContentMissing')
  }
  if (!supplierBatchNo) {
    notes.push('rawMaterials.catalog.cleanedPreview.notes.supplierBatchMissing')
  }

  return {
    resinContentPercent,
    supplierBatchNo,
    derivation: 'split_from_raw',
    notes,
  }
}

export type PrepregDimensionDerivation =
  | 'manual'
  | 'length_from_area'
  | 'area_from_length'
  | 'width_from_area_and_length'

export interface PrepregCleanedDimensionFields {
  widthMm: string
  lengthM: string
  nominalAreaM2: string
  derivation: PrepregDimensionDerivation
  notes: string[]
}

function parsePositiveNumber(value: string): number {
  const matched = value.match(/-?\d+(?:\.\d+)?/)
  if (!matched) return 0
  const parsed = Number.parseFloat(matched[0])
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return parsed
}

function formatNumber(value: number, maxDigits = 3): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  return Number.parseFloat(value.toFixed(maxDigits)).toString()
}

export function cleanPrepregDimensionFields(source: {
  widthMm: string
  nominalAreaM2: string
  lengthM?: string
  fallbackLengthM?: string
}): PrepregCleanedDimensionFields {
  let widthMm = parsePositiveNumber(source.widthMm)
  const currentLengthM = parsePositiveNumber(source.lengthM || '')
  const fallbackLengthM = parsePositiveNumber(source.fallbackLengthM || '')
  let lengthM = currentLengthM
  let nominalAreaM2 = parsePositiveNumber(source.nominalAreaM2)
  let derivation: PrepregDimensionDerivation = 'manual'
  const notes: string[] = []

  if (!lengthM && widthMm && nominalAreaM2) {
    lengthM = nominalAreaM2 / (widthMm / 1000)
    derivation = 'length_from_area'
  }

  if (!lengthM && fallbackLengthM) {
    lengthM = fallbackLengthM
  }

  if (!nominalAreaM2 && widthMm && lengthM) {
    nominalAreaM2 = (widthMm / 1000) * lengthM
    derivation = derivation === 'manual' ? 'area_from_length' : derivation
  }

  if (!widthMm && nominalAreaM2 && lengthM) {
    widthMm = (nominalAreaM2 / lengthM) * 1000
    derivation =
      derivation === 'manual' ? 'width_from_area_and_length' : derivation
  }

  if (widthMm && lengthM && nominalAreaM2) {
    const calculatedArea = (widthMm / 1000) * lengthM
    const diff = Math.abs(calculatedArea - nominalAreaM2)
    const base = Math.max(nominalAreaM2, 1)
    if (diff / base > 0.02) {
      notes.push('rawMaterials.catalog.cleanedPreview.notes.areaMismatch')
    }
  }

  return {
    widthMm: formatNumber(widthMm, 1),
    lengthM: formatNumber(lengthM, 3),
    nominalAreaM2: formatNumber(nominalAreaM2, 3),
    derivation,
    notes,
  }
}

export function prepregSpecSummary(spec: PrepregMaterialSpec): string {
  return [
    spec.displayAlias,
    spec.supplierProductCode,
    spec.resinContentPercent ? `${spec.resinContentPercent}%` : '',
    spec.widthMm ? `${spec.widthMm}mm` : '',
    spec.lengthM ? `${spec.lengthM}m` : '',
    spec.nominalAreaM2 ? `${spec.nominalAreaM2}m2` : '',
    spec.boxNo || '',
  ]
    .filter(Boolean)
    .join(' / ')
}

export function mergePrepregRecognizedFields(
  current: PrepregFormState,
  fields: Partial<PrepregFormState>
): PrepregFormState {
  return Object.entries(fields).reduce<PrepregFormState>(
    (next, [key, value]) => {
      if (typeof value !== 'string' || !value.trim()) return next
      return { ...next, [key]: value.trim() }
    },
    current
  )
}
