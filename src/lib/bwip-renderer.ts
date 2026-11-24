import { loadBwipJs } from './lazy-vendors'

type SupportedBarcodeType = 'datamatrix' | 'qrcode' | 'code128'

function resolveBcid(type: SupportedBarcodeType) {
  if (type === 'qrcode') return 'qrcode'
  if (type === 'code128') return 'code128'
  return 'datamatrix'
}

export async function renderBwipBarcode(options: {
  canvas: HTMLCanvasElement
  code: string
  type: SupportedBarcodeType
  qrCodeQuietZoneModules?: number
}) {
  const bwipjs = await loadBwipJs()
  const isLinearBarcode = options.type === 'code128'
  const renderOptions: Parameters<typeof bwipjs.toCanvas>[1] = {
    bcid: resolveBcid(options.type),
    text: options.code,
    scale: isLinearBarcode ? 3 : 10,
    includetext: false,
    backgroundcolor: 'ffffff',
    barcolor: '000000',
  }

  if (isLinearBarcode) {
    renderOptions.height = 18
    // Code128 requires at least ten narrow modules on both sides.
    renderOptions.paddingwidth = 10
    renderOptions.paddingheight = 4
  }

  if (options.type === 'qrcode' && options.qrCodeQuietZoneModules) {
    // BWIPP's default QR module is two points; bwip-js padding uses points.
    const qrCodeQuietZonePoints = options.qrCodeQuietZoneModules * 2
    renderOptions.paddingwidth = qrCodeQuietZonePoints
    renderOptions.paddingheight = qrCodeQuietZonePoints
  }

  bwipjs.toCanvas(options.canvas, renderOptions)
}
