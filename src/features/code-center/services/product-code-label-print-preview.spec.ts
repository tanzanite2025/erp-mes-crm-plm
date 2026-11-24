// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  buildProductCodeLabelPrintDocument,
  ProductCodeLabelPrintPreviewBlockedError,
  openProductCodeLabelPrintPreview,
} from './product-code-label-print-preview'

describe('buildProductCodeLabelPrintDocument', () => {
  it('builds both symbols for one code, supports all print layouts, and escapes metadata', () => {
    const html = buildProductCodeLabelPrintDocument([
      {
        linearBarcodeDataUrl: 'data:image/png;base64,barcode-image',
        qrCodeDataUrl: 'data:image/png;base64,qr-image',
        batchNo: 'P20260719-001',
        code: '25101011R140001',
        fullText: '25101011R140001 H',
        templateName: '<script>alert(1)</script>',
      },
    ])

    expect(html).toContain('@page { size: 70mm 30mm;')
    expect(html).toContain('data:image/png;base64,barcode-image')
    expect(html).toContain('data:image/png;base64,qr-image')
    expect(html).toContain('alt="Code128 25101011R140001"')
    expect(html).toContain('alt="QR 25101011R140001"')
    const previewDocument = new DOMParser().parseFromString(html, 'text/html')
    expect(previewDocument.querySelectorAll('.label-sheet')).toHaveLength(1)
    expect(
      Array.from(previewDocument.querySelectorAll('option')).map(
        (option) => option.value
      )
    ).toEqual(['both', 'code128', 'qrcode'])
    expect(previewDocument.body.dataset.printLayout).toBe('both')
    expect(html).toContain('25101011R140001 H')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it('requires at least one product label', () => {
    expect(() => buildProductCodeLabelPrintDocument([])).toThrow()
  })
})

describe('openProductCodeLabelPrintPreview', () => {
  it('fails before persistence when the browser blocks the preview window', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)

    expect(() => openProductCodeLabelPrintPreview()).toThrow(
      ProductCodeLabelPrintPreviewBlockedError
    )
  })

  it('reuses the loaded application font without starting another popup font download', () => {
    const originalFontsDescriptor = Object.getOwnPropertyDescriptor(
      document,
      'fonts'
    )
    const loadedFont = { family: 'Maple UI', status: 'loaded' } as FontFace
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: new Set([loadedFont]),
    })
    const popupDocument = document.implementation.createHTMLDocument()
    const popupFonts = new Set<FontFace>()
    Object.defineProperty(popupDocument, 'fonts', { value: popupFonts })
    vi.spyOn(window, 'open').mockReturnValue({
      document: popupDocument,
      focus: vi.fn(),
      closed: false,
    } as unknown as Window)

    try {
      const preview = openProductCodeLabelPrintPreview()
      preview.showLabels([
        {
          linearBarcodeDataUrl: 'data:image/png;base64,linear',
          qrCodeDataUrl: 'data:image/png;base64,qr',
          code: '26N10011R140001',
          fullText: '26N10011R140001',
          batchNo: 'PREVIEW',
          templateName: 'Product',
        },
      ])
      expect(popupFonts.has(loadedFont)).toBe(true)
      expect(popupDocument.head.textContent).not.toContain('@font-face')
      expect(popupDocument.querySelectorAll('.label-sheet')).toHaveLength(1)
    } finally {
      if (originalFontsDescriptor)
        Object.defineProperty(document, 'fonts', originalFontsDescriptor)
      else Reflect.deleteProperty(document, 'fonts')
    }
  })
})
