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
    renderOptions.paddingwidth = 6
    renderOptions.paddingheight = 4
  }

  bwipjs.toCanvas(options.canvas, renderOptions)
}
