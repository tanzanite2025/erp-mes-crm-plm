// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { renderBwipBarcode } from './bwip-renderer'
import { renderProductCodeLinearBarcodeAndQrCodeImages } from './product-code-linear-barcode-and-qr-code-renderer'

vi.mock('./bwip-renderer', () => ({ renderBwipBarcode: vi.fn() }))

describe('renderProductCodeLinearBarcodeAndQrCodeImages', () => {
  it('passes the identical value to both encoders and gives QR its quiet zone', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL')
      .mockReturnValueOnce('data:image/png;base64,linear')
      .mockReturnValueOnce('data:image/png;base64,qr')

    const images =
      await renderProductCodeLinearBarcodeAndQrCodeImages('26N10011R140001')
    expect(
      vi.mocked(renderBwipBarcode).mock.calls.map(([options]) => ({
        code: options.code,
        type: options.type,
      }))
    ).toEqual([
      { code: '26N10011R140001', type: 'code128' },
      { code: '26N10011R140001', type: 'qrcode' },
    ])
    expect(
      vi.mocked(renderBwipBarcode).mock.calls[1][0].qrCodeQuietZoneModules
    ).toBe(4)
    expect(images).toEqual({
      linearBarcodeDataUrl: 'data:image/png;base64,linear',
      qrCodeDataUrl: 'data:image/png;base64,qr',
    })
  })

  it('does not return a partially rendered pair when QR rendering fails', async () => {
    vi.mocked(renderBwipBarcode)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('QR render failed'))
    await expect(
      renderProductCodeLinearBarcodeAndQrCodeImages('26N10011R140001')
    ).rejects.toThrow('QR render failed')
  })
})
