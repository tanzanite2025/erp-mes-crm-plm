import { describe, expect, it } from 'vitest'
import { parseProductCodeForDisplay } from './product-code-parser'
import { assembleCanonicalProductCode } from './product-code-protocol'

describe('parseProductCodeForDisplay', () => {
  it('keeps every identity segment and scan payload when resolving display labels', () => {
    const code = '25N01011D140001'
    const parsed = parseProductCodeForDisplay(code, {
      products: [{ modelCode: '01', name: 'Wheel A' }],
      appearanceMapping: { '1': { label: 'Black' } },
      holeCodeCombinationLabels: { D14: 'Spoke holes' },
    })

    expect(parsed.isValid).toBe(true)
    expect(assembleCanonicalProductCode(parsed.segments)).toBe(code)
    expect(parsed.display).toEqual({
      scannableText: code,
      shortTag: 'D14-Black',
      fullDescription:
        '2025年11月01日 · Wheel A · Black · Spoke holes · 流水号:0001',
    })
  })

  it('keeps preview placeholders displayable and rejects unsupported lengths', () => {
    expect(
      parseProductCodeForDisplay('25101011R14****').display.scannableText
    ).toBe('25101011R14****')
    expect(parseProductCodeForDisplay('25101011R14****').isValid).toBe(true)
    expect(parseProductCodeForDisplay('25101011R1400001').isValid).toBe(false)
    expect(parseProductCodeForDisplay('').isValid).toBe(false)
  })
})
