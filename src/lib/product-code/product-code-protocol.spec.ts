import { describe, expect, it } from 'vitest'
import {
  assembleCanonicalProductCode,
  assembleProductCodeForRulePreview,
  formatProductCodeMonthSegment,
} from './product-code-protocol'

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

describe('assembleCanonicalProductCode', () => {
  it('assembles the canonical 15-character wheel barcode', () => {
    const code = assembleCanonicalProductCode(validInput)

    expect(code).toBe('25101011R140001')
    expect(code).toHaveLength(15)
  })

  it('rejects the legacy five-character serial', () => {
    expect(() =>
      assembleCanonicalProductCode({ ...validInput, serial: '00001' })
    ).toThrow('Invalid linear barcode segment: serial')
  })

  it('keeps placeholder serials exclusive to rule previews', () => {
    const previewInput = { ...validInput, serial: '****' }
    expect(assembleProductCodeForRulePreview(previewInput)).toBe(
      '25101011R14****'
    )
    expect(() => assembleCanonicalProductCode(previewInput)).toThrow(
      'Invalid linear barcode segment: serial'
    )
  })

  it('preserves normalized segments and the encoded month across the full year', () => {
    expect(
      assembleCanonicalProductCode({
        ...validInput,
        month: ' n ',
        holePrefix: ' d ',
      })
    ).toBe('25N01011D140001')
    expect(
      Array.from({ length: 12 }, (_, month) =>
        formatProductCodeMonthSegment(new Date(2026, month, 1))
      )
    ).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'N', 'D'])
  })
})
