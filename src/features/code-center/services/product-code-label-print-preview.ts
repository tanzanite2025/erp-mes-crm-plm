import type { AppLocale } from '@/locales'
import localMapleUiFontStyles from '@/styles/local-maple-ui-font.css?raw'
import { getCurrentLocale } from '@/lib/locale'
import {
  renderProductCodeLinearBarcodeAndQrCodeImages,
  type ProductCodeLinearBarcodeAndQrCodeImages,
} from '@/lib/product-code-linear-barcode-and-qr-code-renderer'

export interface ProductCodePrintableLabel extends ProductCodeLinearBarcodeAndQrCodeImages {
  batchNo: string
  code: string
  fullText: string
  templateName: string
}

export class ProductCodeLabelPrintPreviewBlockedError extends Error {
  readonly code = 'LINEAR_BARCODE_PRINT_PREVIEW_BLOCKED'

  constructor() {
    super('The browser blocked the linear-barcode print preview window.')
    this.name = 'ProductCodeLabelPrintPreviewBlockedError'
  }
}

export class ProductCodeLabelPrintPreviewClosedError extends Error {
  readonly code = 'LINEAR_BARCODE_PRINT_PREVIEW_CLOSED'

  constructor() {
    super('The linear-barcode print preview window was closed.')
    this.name = 'ProductCodeLabelPrintPreviewClosedError'
  }
}

export class ProductCodeLabelPrintRenderError extends Error {
  readonly code = 'LINEAR_BARCODE_PRINT_RENDER_FAILED'

  constructor(readonly renderCause: unknown) {
    super('Failed to render the product linear barcode and QR code.')
    this.name = 'ProductCodeLabelPrintRenderError'
  }
}

export interface ProductCodeLabelPrintPreviewSession {
  close: () => void
  isOpen: () => boolean
  renderProductCodeSymbols: (
    code: string
  ) => Promise<ProductCodeLinearBarcodeAndQrCodeImages>
  showError: (message: string) => void
  showLabels: (labels: ProductCodePrintableLabel[]) => void
}

function escapeProductCodeLabelHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function writeProductCodeLabelPrintWindowDocument(
  printWindow: Window,
  html: string
) {
  const loadedApplicationFonts = document.fonts
    ? Array.from(document.fonts).filter(
        (font) =>
          font.status === 'loaded' &&
          font.family.replace(/['"]/g, '') === 'Maple UI'
      )
    : []
  printWindow.document.open()
  printWindow.document.write(
    loadedApplicationFonts.length > 0
      ? html.replace(/@font-face\s*\{[^}]*\}/g, '')
      : html
  )
  printWindow.document.close()
  // Reuse loaded fonts before the popup's first layout, including about:blank previews.
  // This also avoids fetching the large application font again for each print window.
  if (printWindow.document.fonts) {
    loadedApplicationFonts.forEach((font) =>
      printWindow.document.fonts.add(font)
    )
  }
}

function buildProductCodeLabelPrintLoadingDocument() {
  return `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>Code128 + QR Print Preview</title>
        <style>
          ${localMapleUiFontStyles}
          body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #f8fafc; color: #334155; }
          .status { font-size: 14px; font-weight: 700; }
        </style>
      </head>
      <body><div class="status">正在生成一维码与二维码 / Preparing Code128 + QR labels...</div></body>
    </html>
  `
}

function buildProductCodeLabelPrintErrorDocument(message: string) {
  return `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>Product Code Print Error</title>
        <style>
          ${localMapleUiFontStyles}
          body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #fff; color: #991b1b; }
          .error { max-width: 560px; padding: 24px; border: 1px solid #fecaca; border-radius: 8px; background: #fff1f2; font-size: 14px; font-weight: 700; line-height: 1.7; }
        </style>
      </head>
      <body><div class="error">${escapeProductCodeLabelHtml(message)}</div></body>
    </html>
  `
}

function buildProductCodePrintableLabelsHtml(
  labels: ProductCodePrintableLabel[]
) {
  return labels
    .map(
      (label) => `
        <section class="label-sheet" data-product-code="${escapeProductCodeLabelHtml(label.code)}">
          <div class="label-meta">
            <span>${escapeProductCodeLabelHtml(label.templateName)}</span>
            <span>${escapeProductCodeLabelHtml(label.batchNo)}</span>
          </div>
          <div class="symbol-row">
            <img class="barcode" src="${escapeProductCodeLabelHtml(label.linearBarcodeDataUrl)}" alt="Code128 ${escapeProductCodeLabelHtml(label.code)}" />
            <img class="qrcode" src="${escapeProductCodeLabelHtml(label.qrCodeDataUrl)}" alt="QR ${escapeProductCodeLabelHtml(label.code)}" />
          </div>
          <div class="readable-code">${escapeProductCodeLabelHtml(label.fullText)}</div>
        </section>
      `
    )
    .join('')
}

export function buildProductCodeLabelPrintDocument(
  labels: ProductCodePrintableLabel[],
  locale: AppLocale = 'zh-CN'
) {
  if (labels.length === 0) {
    throw new Error('At least one linear-barcode label is required.')
  }

  return `
    <!doctype html>
    <html lang="${locale}">
      <head>
        <meta charset="utf-8" />
        <title>Code128 + QR Print Preview</title>
        <style>
          ${localMapleUiFontStyles}
          @page { size: 70mm 30mm; margin: 2mm; }
          @page product-code-single-symbol { size: 70mm 30mm; margin: 2mm; }
          @page product-code-both-symbols { size: 90mm 35mm; margin: 2mm; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #e2e8f0; color: #0f172a; }
          .toolbar { position: sticky; top: 0; z-index: 2; display: flex; justify-content: flex-end; gap: 8px; padding: 12px; border-bottom: 1px solid #cbd5e1; background: #fff; }
          .toolbar button { min-height: 36px; border: 1px solid #94a3b8; border-radius: 6px; background: #fff; padding: 0 14px; color: #0f172a; font-size: 12px; font-weight: 700; cursor: pointer; }
          .toolbar label { display: flex; align-items: center; gap: 8px; font-size: 12px; }
          .toolbar select { min-height: 36px; border: 1px solid #94a3b8; border-radius: 6px; background: #fff; padding: 0 8px; }
          .preview-stack { display: grid; justify-content: center; gap: 12px; padding: 16px; }
          .label-sheet { page: product-code-single-symbol; width: 66mm; height: 26mm; display: grid; grid-template-rows: 2mm minmax(0, 1fr) 3.2mm; align-items: center; gap: 0.5mm; overflow: hidden; border: 1px solid #94a3b8; border-radius: 6px; background: #fff; padding: 1mm 2mm; break-after: page; page-break-after: always; }
          body[data-print-layout="both"] .label-sheet { page: product-code-both-symbols; width: 86mm; height: 31mm; }
          .label-sheet:last-child { break-after: auto; page-break-after: auto; }
          .label-meta { display: flex; justify-content: space-between; gap: 3mm; overflow: hidden; color: #475569; font-size: 2mm; line-height: 1; font-weight: 700; white-space: nowrap; }
          .label-meta span { overflow: hidden; text-overflow: ellipsis; }
          .symbol-row { display: flex; min-height: 0; height: 100%; align-items: center; justify-content: center; gap: 3mm; }
          .barcode { display: block; min-width: 0; flex: 1; width: 0; height: 13mm; object-fit: fill; image-rendering: pixelated; }
          .qrcode { display: block; flex: 0 0 21mm; width: 21mm; height: 21mm; object-fit: contain; image-rendering: pixelated; }
          body[data-print-layout="code128"] .qrcode { display: none; }
          body[data-print-layout="qrcode"] .barcode { display: none; }
          body[data-print-layout="qrcode"] .qrcode { flex-basis: 17mm; width: 17mm; height: 17mm; }
          .readable-code { overflow: hidden; color: #020617; font-size: 3.2mm; line-height: 1; font-weight: 800; text-align: center; white-space: nowrap; }
          @media print {
            body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .toolbar { display: none; }
            .preview-stack { display: block; padding: 0; }
            .label-sheet { border: 0; border-radius: 0; }
          }
        </style>
      </head>
      <body data-print-layout="both">
        <div class="toolbar">
          <label>${locale === 'en-US' ? 'Label format' : '标签格式'}
            <select aria-label="${locale === 'en-US' ? 'Label format' : '标签格式'}" onchange="document.body.dataset.printLayout = this.value">
              <option value="both" selected>${locale === 'en-US' ? 'Code128 + QR · 90 × 35 mm' : '一维码 + 二维码 · 90 × 35 mm'}</option>
              <option value="code128">${locale === 'en-US' ? 'Code128 · 70 × 30 mm' : '一维码 · 70 × 30 mm'}</option>
              <option value="qrcode">${locale === 'en-US' ? 'QR Code · 70 × 30 mm' : '二维码 · 70 × 30 mm'}</option>
            </select>
          </label>
          <button type="button" onclick="Promise.all(Array.from(document.images, image => image.decode())).then(() => document.fonts.ready).then(() => window.print())">${locale === 'en-US' ? 'Print' : '打印'}</button>
          <button type="button" onclick="window.close()">${locale === 'en-US' ? 'Close' : '关闭'}</button>
        </div>
        <main class="preview-stack">${buildProductCodePrintableLabelsHtml(labels)}</main>
      </body>
    </html>
  `
}

export function openProductCodeLabelPrintPreview(): ProductCodeLabelPrintPreviewSession {
  const printWindow = window.open('', '_blank', 'width=980,height=760')
  if (!printWindow) {
    throw new ProductCodeLabelPrintPreviewBlockedError()
  }

  writeProductCodeLabelPrintWindowDocument(
    printWindow,
    buildProductCodeLabelPrintLoadingDocument()
  )
  printWindow.focus()

  const assertProductCodeLabelPrintWindowIsOpen = () => {
    if (printWindow.closed) {
      throw new ProductCodeLabelPrintPreviewClosedError()
    }
  }

  return {
    close: () => {
      if (!printWindow.closed) {
        printWindow.close()
      }
    },
    isOpen: () => !printWindow.closed,
    renderProductCodeSymbols: async (code) => {
      assertProductCodeLabelPrintWindowIsOpen()

      try {
        const images = await renderProductCodeLinearBarcodeAndQrCodeImages(code)
        assertProductCodeLabelPrintWindowIsOpen()
        return images
      } catch (error) {
        if (error instanceof ProductCodeLabelPrintPreviewClosedError) {
          throw error
        }
        throw new ProductCodeLabelPrintRenderError(error)
      }
    },
    showError: (message) => {
      if (printWindow.closed) return
      writeProductCodeLabelPrintWindowDocument(
        printWindow,
        buildProductCodeLabelPrintErrorDocument(message)
      )
      printWindow.focus()
    },
    showLabels: (labels) => {
      assertProductCodeLabelPrintWindowIsOpen()
      writeProductCodeLabelPrintWindowDocument(
        printWindow,
        buildProductCodeLabelPrintDocument(labels, getCurrentLocale())
      )
      printWindow.focus()
    },
  }
}
