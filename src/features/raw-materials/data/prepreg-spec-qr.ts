import {
  buildPrepregSpecPayload,
  type PrepregCleanedDimensionFields,
  type PrepregCleanedResinBatchFields,
  type PrepregFormState,
  type PrepregMaterialSpec,
  type PrepregMaterialSpecStatus,
} from './prepreg-material-spec-schema'

export type PrepregSpecQrPayload = {
  protocol: 'prepreg_spec_label_v1'
  code: string
  name: string
  displayAlias: string
  supplierId: string
  supplierProductCode: string
  fiberModel: string
  resinContentPercent: string
  supplierBatchNo: string
  widthMm: string
  lengthM: string
  nominalAreaM2: string
  inspector: string
  boxNo: string
  productionDate: string
  status: PrepregMaterialSpecStatus
  description: string
}

export type PrepregSpecQrSnapshot = {
  payload: PrepregSpecQrPayload
  payloadText: string
  fingerprint: string
  title: string
  resinLabel: string
}

export function buildPrepregSpecQrSnapshot(source: {
  form: PrepregFormState
  editingSpec?: PrepregMaterialSpec | null
  cleanedDimensions: PrepregCleanedDimensionFields
  cleanedResinBatch: PrepregCleanedResinBatchFields
}): PrepregSpecQrSnapshot {
  const savedPayload = buildPrepregSpecPayload(
    source.form,
    source.editingSpec || null
  )
  const payload: PrepregSpecQrPayload = {
    protocol: 'prepreg_spec_label_v1',
    code: savedPayload.code?.trim() || '',
    name: savedPayload.name?.trim() || '',
    displayAlias: savedPayload.displayAlias?.trim() || '',
    supplierId: savedPayload.supplierId?.trim() || '',
    supplierProductCode: savedPayload.supplierProductCode?.trim() || '',
    fiberModel: savedPayload.fiberModel?.trim() || '',
    resinContentPercent:
      savedPayload.resinContentPercent?.trim() ||
      source.cleanedResinBatch.resinContentPercent.trim(),
    supplierBatchNo:
      savedPayload.supplierBatchNo?.trim() ||
      source.cleanedResinBatch.supplierBatchNo.trim(),
    widthMm:
      savedPayload.widthMm?.trim() || source.cleanedDimensions.widthMm.trim(),
    lengthM:
      savedPayload.lengthM?.trim() || source.cleanedDimensions.lengthM.trim(),
    nominalAreaM2:
      savedPayload.nominalAreaM2?.trim() ||
      source.cleanedDimensions.nominalAreaM2.trim(),
    inspector: savedPayload.inspector?.trim() || '',
    boxNo: savedPayload.boxNo?.trim() || '',
    productionDate: savedPayload.productionDate?.trim() || '',
    status: savedPayload.status || source.form.status,
    description: savedPayload.description?.trim() || '',
  }

  const payloadText = JSON.stringify(payload)

  return {
    payload,
    payloadText,
    fingerprint: payloadText,
    title: payload.displayAlias || payload.name || payload.code || '--',
    resinLabel: [
      payload.resinContentPercent ? `${payload.resinContentPercent}%` : '',
      payload.supplierBatchNo,
    ]
      .filter(Boolean)
      .join(' / '),
  }
}

export function canGeneratePrepregSpecQr(
  snapshot: PrepregSpecQrSnapshot
): boolean {
  return Boolean(snapshot.payload.code && snapshot.payload.name)
}
