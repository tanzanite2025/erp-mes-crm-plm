import { describe, expect, it } from 'vitest'
import {
  EMPTY_PREPREG_FORM,
  buildPrepregSpecPayload,
  cleanPrepregDimensionFields,
  cleanPrepregResinBatchFields,
  type PrepregMaterialSpec,
} from './prepreg-material-spec-schema'

describe('cleanPrepregResinBatchFields', () => {
  it('splits resin percent and batch no from raw combined text', () => {
    const result = cleanPrepregResinBatchFields({
      resinContentBatchRaw: '37%/260204',
    })

    expect(result.resinContentPercent).toBe('37')
    expect(result.supplierBatchNo).toBe('260204')
    expect(result.derivation).toBe('split_from_raw')
    expect(result.notes).toHaveLength(0)
  })

  it('does not parse resin percent when percent sign is missing', () => {
    const result = cleanPrepregResinBatchFields({
      resinContentBatchRaw: '260204',
    })

    expect(result.resinContentPercent).toBe('')
    expect(result.supplierBatchNo).toBe('260204')
    expect(result.notes.length).toBeGreaterThan(0)
  })

  it('clears both fields when raw combined text is emptied', () => {
    const result = cleanPrepregResinBatchFields({
      resinContentBatchRaw: '   ',
    })

    expect(result.resinContentPercent).toBe('')
    expect(result.supplierBatchNo).toBe('')
    expect(result.derivation).toBe('manual')
    expect(result.notes).toHaveLength(0)
  })
})

describe('cleanPrepregDimensionFields', () => {
  it('derives length from width + nominal area', () => {
    const result = cleanPrepregDimensionFields({
      widthMm: '1000',
      nominalAreaM2: '150',
    })

    expect(result.widthMm).toBe('1000')
    expect(result.nominalAreaM2).toBe('150')
    expect(result.lengthM).toBe('150')
    expect(result.derivation).toBe('length_from_area')
  })

  it('prefers recalculated length over fallback length when width and area are both present', () => {
    const result = cleanPrepregDimensionFields({
      widthMm: '1200',
      nominalAreaM2: '150',
      fallbackLengthM: '100',
    })

    expect(result.lengthM).toBe('125')
    expect(result.derivation).toBe('length_from_area')
    expect(result.notes).toHaveLength(0)
  })
})

describe('buildPrepregSpecPayload', () => {
  it('builds payload with cleaned fields and without removed legacy fields', () => {
    const payload = buildPrepregSpecPayload(
      {
        ...EMPTY_PREPREG_FORM,
        code: 'CFS-247-75',
        name: '单向预浸料',
        resinContentBatchRaw: '37%/260204',
        widthMm: '1000',
        nominalAreaM2: '150',
        inspector: 'Z',
        boxNo: '23',
      },
      null,
    )

    expect(payload.code).toBe('CFS-247-75')
    expect(payload.resinContentPercent).toBe('37')
    expect(payload.supplierBatchNo).toBe('260204')
    expect(payload.lengthM).toBe('150')
    expect(payload).not.toHaveProperty('resinModel')
    expect(payload).not.toHaveProperty('areaWeightGsm')
    expect(payload).not.toHaveProperty('rollNo')
    expect(payload).not.toHaveProperty('storageRequirement')
  })

  it('recalculates length and clears resin batch fields when editing values are changed or emptied', () => {
    const editing: PrepregMaterialSpec = {
      id: 'spec-1',
      code: 'CFS-247-75',
      name: '单向预浸料',
      displayAlias: 'UD-247',
      supplierId: 'supplier-1',
      supplierProductCode: 'SUP-247',
      fiberModel: 'T700',
      resinContentPercent: '37',
      widthMm: '1000',
      lengthM: '100',
      nominalAreaM2: '100',
      supplierBatchNo: '260204',
      inspector: 'Z',
      boxNo: '23',
      productionDate: '2026-03-06',
      description: '',
      status: 'Active',
      version: 3,
    }
    const payload = buildPrepregSpecPayload(
      {
        ...EMPTY_PREPREG_FORM,
        code: editing.code,
        name: editing.name,
        widthMm: '1200',
        nominalAreaM2: '150',
        resinContentBatchRaw: '',
      },
      editing,
    )

    expect(payload.lengthM).toBe('125')
    expect(payload.nominalAreaM2).toBe('150')
    expect(payload.resinContentPercent).toBe('')
    expect(payload.supplierBatchNo).toBe('')
  })
})

