import { renderBwipBarcode } from './bwip-renderer'

export interface ProductCodeLinearBarcodeAndQrCodeImages {
  linearBarcodeDataUrl: string
  qrCodeDataUrl: string
}

/** Both symbols encode the exact same supplied value; rendering never issues a number. */
export async function renderProductCodeLinearBarcodeAndQrCodeImages(
  code: string
): Promise<ProductCodeLinearBarcodeAndQrCodeImages> {
  const linearBarcodeCanvas = document.createElement('canvas')
  const qrCodeCanvas = document.createElement('canvas')

  await Promise.all([
    renderBwipBarcode({ canvas: linearBarcodeCanvas, code, type: 'code128' }),
    renderBwipBarcode({
      canvas: qrCodeCanvas,
      code,
      type: 'qrcode',
      qrCodeQuietZoneModules: 4,
    }),
  ])

  return {
    linearBarcodeDataUrl: linearBarcodeCanvas.toDataURL('image/png'),
    qrCodeDataUrl: qrCodeCanvas.toDataURL('image/png'),
  }
}
