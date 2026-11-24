import bwipjs from 'bwip-js'
import { describe, expect, it, vi } from 'vitest'
import { renderBwipBarcode } from './bwip-renderer'

const renderedBarcodeOptions = vi.hoisted(() => ({
  current: undefined as bwipjs.RenderOptions | undefined,
}))

vi.mock('./lazy-vendors', () => ({
  loadBwipJs: async () => ({
    toCanvas: (_canvas: HTMLCanvasElement, options: bwipjs.RenderOptions) => {
      renderedBarcodeOptions.current = options
    },
  }),
}))

function getActualRenderedSymbolDimensions(options: bwipjs.RenderOptions) {
  // The installed legacy @types package omits the documented toSVG API.
  const svgRenderer = bwipjs as typeof bwipjs & {
    toSVG: (options: bwipjs.RenderOptions) => string
  }
  const svg = svgRenderer.toSVG(options)
  const dimensions = svg.match(/viewBox="0 0 (\d+) (\d+)"/)
  if (!dimensions) throw new Error('Rendered symbol has no SVG dimensions')
  return { width: Number(dimensions[1]), height: Number(dimensions[2]) }
}

describe('barcode symbol quiet zones in actual bwip-js output', () => {
  it.each(['26N10011R140001', '26N10011R140001'.repeat(4)])(
    'keeps four complete QR modules on every side for %s',
    async (code) => {
      await renderBwipBarcode({
        canvas: {} as HTMLCanvasElement,
        code,
        type: 'qrcode',
        qrCodeQuietZoneModules: 4,
      })
      const options = renderedBarcodeOptions.current!
      const { width, height } = getActualRenderedSymbolDimensions(options)
      const [symbol] = bwipjs.raw({ bcid: 'qrcode', text: code })
      if (!('pixx' in symbol)) throw new Error('Expected a QR module matrix')
      const moduleWidth =
        (symbol.width * 72 * Number(options.scale)) / symbol.pixx
      const moduleHeight =
        (symbol.height * 72 * Number(options.scale)) / symbol.pixy
      expect((width / moduleWidth - symbol.pixx) / 2).toBeCloseTo(4)
      expect((height / moduleHeight - symbol.pixy) / 2).toBeCloseTo(4)
    }
  )

  it('keeps ten narrow Code128 modules on both sides', async () => {
    const code = '26N10011R140001'
    await renderBwipBarcode({
      canvas: {} as HTMLCanvasElement,
      code,
      type: 'code128',
    })
    const options = renderedBarcodeOptions.current!
    const { width } = getActualRenderedSymbolDimensions(options)
    const [symbol] = bwipjs.raw({ bcid: 'code128', text: code })
    if (!('sbs' in symbol)) throw new Error('Expected Code128 bar widths')
    const symbolModules = symbol.sbs.reduce(
      (sum, moduleWidth) => sum + moduleWidth,
      0
    )
    expect((width / Number(options.scale) - symbolModules) / 2).toBe(10)
  })
})
