import { describe, expect, it } from 'vitest'
import { assembleCanonicalLinearBarcodeCode } from './linear-barcode-protocol'

const validInput = {
  year: '25',
  month: '1',
  day: '01',
  model: '01',
  appearance: '1',
  holePrefix: 'R',
  holes: '14',
  serial: '0001',
}

describe('assembleLinearBarcodeCode', () => {
  it('assembles the canonical 15-character wheel barcode', () => {
    const code = assembleCanonicalLinearBarcodeCode(validInput)

    expect(code).toBe('25101011R140001')
    expect(code).toHaveLength(15)
  })

  it('rejects the legacy five-character serial', () => {
    expect(() =>
      assembleCanonicalLinearBarcodeCode({ ...validInput, serial: '00001' })
    ).toThrow('Invalid linear barcode segment: serial')
  })
})
