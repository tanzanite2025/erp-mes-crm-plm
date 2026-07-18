// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  buildLinearBarcodePrintDocument,
  LinearBarcodePrintPreviewBlockedError,
  openLinearBarcodePrintPreview,
} from './linear-barcode-print-preview'

describe('buildLinearBarcodePrintDocument', () => {
  it('builds a printable Code128 label document and escapes metadata', () => {
    const html = buildLinearBarcodePrintDocument([
      {
        barcodeDataUrl: 'data:image/png;base64,barcode-image',
        batchNo: 'P20260719-001',
        code: '25101011R140001',
        fullText: '25101011R140001 H',
        templateName: '<script>alert(1)</script>',
      },
    ])

    expect(html).toContain('@page { size: 70mm 30mm;')
    expect(html).toContain('data:image/png;base64,barcode-image')
    expect(html).toContain('25101011R140001 H')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })
})

describe('openLinearBarcodePrintPreview', () => {
  it('fails before persistence when the browser blocks the preview window', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)

    expect(() => openLinearBarcodePrintPreview()).toThrow(
      LinearBarcodePrintPreviewBlockedError
    )
  })
})
