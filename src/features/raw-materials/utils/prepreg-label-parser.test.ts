import { describe, expect, it } from 'vitest'
import { parsePrepregLabelText } from './prepreg-label-parser'

describe('parsePrepregLabelText', () => {
  it('extracts code, resin/batch, and width from mixed OCR text', () => {
    const result = parsePrepregLabelText('CFS-247-75 37%/260204 1000MM')

    expect(result.code).toBe('CFS-247-75')
    expect(result.resinContentBatchRaw).toContain('37%')
    expect(result.widthMm).toBe('1000')
  })

  it('returns empty object for blank input', () => {
    expect(parsePrepregLabelText('   ')).toEqual({})
  })
})

