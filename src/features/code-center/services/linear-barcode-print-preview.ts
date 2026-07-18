import { renderBwipBarcode } from '@/lib/bwip-renderer'

export interface LinearBarcodePrintableLabel {
  barcodeDataUrl: string
  batchNo: string
  code: string
  fullText: string
  templateName: string
}

export class LinearBarcodePrintPreviewBlockedError extends Error {
  readonly code = 'LINEAR_BARCODE_PRINT_PREVIEW_BLOCKED'

  constructor() {
    super('The browser blocked the linear-barcode print preview window.')
    this.name = 'LinearBarcodePrintPreviewBlockedError'
  }
}

export class LinearBarcodePrintPreviewClosedError extends Error {
  readonly code = 'LINEAR_BARCODE_PRINT_PREVIEW_CLOSED'

  constructor() {
    super('The linear-barcode print preview window was closed.')
    this.name = 'LinearBarcodePrintPreviewClosedError'
  }
}

export class LinearBarcodePrintRenderError extends Error {
  readonly code = 'LINEAR_BARCODE_PRINT_RENDER_FAILED'

  constructor(readonly renderCause: unknown) {
    super('Failed to render the Code128 label.')
    this.name = 'LinearBarcodePrintRenderError'
  }
}

export interface LinearBarcodePrintPreviewSession {
  close: () => void
  isOpen: () => boolean
  renderBarcode: (code: string) => Promise<string>
  showError: (message: string) => void
  showLabels: (labels: LinearBarcodePrintableLabel[]) => void
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function writeDocument(printWindow: Window, html: string) {
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

function buildLoadingDocument() {
  return `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>Code128 Print Preview</title>
        <style>
          body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #f8fafc; color: #334155; font-family: "Microsoft YaHei", Arial, sans-serif; }
          .status { font-size: 14px; font-weight: 700; }
        </style>
      </head>
      <body><div class="status">正在生成 Code128 标签...</div></body>
    </html>
  `
}

function buildErrorDocument(message: string) {
  return `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>Code128 Print Error</title>
        <style>
          body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #fff; color: #991b1b; font-family: "Microsoft YaHei", Arial, sans-serif; }
          .error { max-width: 560px; padding: 24px; border: 1px solid #fecaca; border-radius: 8px; background: #fff1f2; font-size: 14px; font-weight: 700; line-height: 1.7; }
        </style>
      </head>
      <body><div class="error">${escapeHtml(message)}</div></body>
    </html>
  `
}

function buildLabelsHtml(labels: LinearBarcodePrintableLabel[]) {
  return labels
    .map(
      (label) => `
        <section class="label-sheet">
          <div class="label-meta">
            <span>${escapeHtml(label.templateName)}</span>
            <span>${escapeHtml(label.batchNo)}</span>
          </div>
          <img class="barcode" src="${escapeHtml(label.barcodeDataUrl)}" alt="${escapeHtml(label.code)}" />
          <div class="readable-code">${escapeHtml(label.fullText)}</div>
        </section>
      `
    )
    .join('')
}

export function buildLinearBarcodePrintDocument(
  labels: LinearBarcodePrintableLabel[]
) {
  if (labels.length === 0) {
    throw new Error('At least one linear-barcode label is required.')
  }

  return `
    <!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <title>Code128 Print Preview</title>
        <style>
          @page { size: 70mm 30mm; margin: 2mm; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #e2e8f0; color: #0f172a; font-family: "Microsoft YaHei", Arial, sans-serif; }
          .toolbar { position: sticky; top: 0; z-index: 2; display: flex; justify-content: flex-end; gap: 8px; padding: 12px; border-bottom: 1px solid #cbd5e1; background: #fff; }
          .toolbar button { min-height: 36px; border: 1px solid #94a3b8; border-radius: 6px; background: #fff; padding: 0 14px; color: #0f172a; font-size: 12px; font-weight: 700; cursor: pointer; }
          .preview-stack { display: grid; justify-content: center; gap: 12px; padding: 16px; }
          .label-sheet { width: 66mm; min-height: 26mm; display: grid; grid-template-rows: auto 1fr auto; align-items: center; gap: 1mm; overflow: hidden; border: 1px solid #94a3b8; border-radius: 6px; background: #fff; padding: 1.5mm 2mm; break-after: page; page-break-after: always; }
          .label-sheet:last-child { break-after: auto; page-break-after: auto; }
          .label-meta { display: flex; justify-content: space-between; gap: 3mm; overflow: hidden; color: #475569; font-size: 2.2mm; font-weight: 700; white-space: nowrap; }
          .label-meta span { overflow: hidden; text-overflow: ellipsis; }
          .barcode { display: block; width: 100%; height: 13mm; object-fit: fill; image-rendering: pixelated; }
          .readable-code { overflow: hidden; color: #020617; font-family: Consolas, "Courier New", monospace; font-size: 3.2mm; font-weight: 800; text-align: center; white-space: nowrap; }
          @media print {
            body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .toolbar { display: none; }
            .preview-stack { display: block; padding: 0; }
            .label-sheet { border: 0; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button type="button" onclick="window.print()">打印 / Print</button>
          <button type="button" onclick="window.close()">关闭 / Close</button>
        </div>
        <main class="preview-stack">${buildLabelsHtml(labels)}</main>
      </body>
    </html>
  `
}

export function openLinearBarcodePrintPreview(): LinearBarcodePrintPreviewSession {
  const printWindow = window.open('', '_blank', 'width=980,height=760')
  if (!printWindow) {
    throw new LinearBarcodePrintPreviewBlockedError()
  }

  writeDocument(printWindow, buildLoadingDocument())
  printWindow.focus()

  const assertOpen = () => {
    if (printWindow.closed) {
      throw new LinearBarcodePrintPreviewClosedError()
    }
  }

  return {
    close: () => {
      if (!printWindow.closed) {
        printWindow.close()
      }
    },
    isOpen: () => !printWindow.closed,
    renderBarcode: async (code) => {
      assertOpen()
      const canvas = document.createElement('canvas')

      try {
        await renderBwipBarcode({ canvas, code, type: 'code128' })
        assertOpen()
        return canvas.toDataURL('image/png')
      } catch (error) {
        if (error instanceof LinearBarcodePrintPreviewClosedError) {
          throw error
        }
        throw new LinearBarcodePrintRenderError(error)
      }
    },
    showError: (message) => {
      if (printWindow.closed) return
      writeDocument(printWindow, buildErrorDocument(message))
      printWindow.focus()
    },
    showLabels: (labels) => {
      assertOpen()
      writeDocument(printWindow, buildLinearBarcodePrintDocument(labels))
      printWindow.focus()
    },
  }
}
