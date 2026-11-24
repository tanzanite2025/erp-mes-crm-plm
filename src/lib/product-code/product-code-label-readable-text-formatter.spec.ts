import { describe, expect, it } from 'vitest'
import { formatProductCodeLabelReadableText } from './product-code-label-readable-text-formatter'

describe('formatProductCodeLabelReadableText', () => {
  const code = '25N01011R140001'

  it('preserves the original code when no label decorations are configured', () => {
    expect(
      formatProductCodeLabelReadableText(code, {
        isDrainHole: false,
        wheelType: '',
        scopeCode: '',
      })
    ).toBe(code)
  })

  it('preserves drain-hole, wheel direction and normalized scope text without changing identity', () => {
    expect(
      formatProductCodeLabelReadableText(code, {
        isDrainHole: true,
        wheelType: 'F',
        scopeCode: ' abc ',
      })
    ).toBe(`H${code} F-ABC`)
    expect(
      formatProductCodeLabelReadableText(code, {
        isDrainHole: false,
        wheelType: '',
        scopeCode: ' abc ',
      })
    ).toBe(`${code} ABC`)
  })
})
