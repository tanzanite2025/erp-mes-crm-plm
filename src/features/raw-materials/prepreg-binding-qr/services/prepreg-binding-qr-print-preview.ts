import type { PrepregBindingQrItem } from '../data/prepreg-binding-qr'

type PrintablePrepregBindingQrItem = PrepregBindingQrItem & {
  qrDataUrl: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildCardsHtml(items: PrintablePrepregBindingQrItem[]) {
  return items
    .map(
      (item, index) => `
        <div class="label-card">
          <div class="label-card__meta">
            <span>PREPREG BINDING QR</span>
            <span>#${index + 1}</span>
          </div>
          <div class="label-card__code">${escapeHtml(item.token)}</div>
          <div class="label-card__qr-wrap">
            <img src="${item.qrDataUrl}" alt="${escapeHtml(item.token)}" class="label-card__qr" />
          </div>
          <div class="label-card__tip">UNBOUND TOKEN / SCAN TO BIND</div>
        </div>
      `
    )
    .join('')
}

export function openPrepregBindingQrPrintPreview(
  items: PrintablePrepregBindingQrItem[]
) {
  if (!items.length) return
  const printWindow = window.open('', '_blank', 'width=1280,height=900')
  if (!printWindow) {
    throw new Error('浏览器拦截了打印预览窗口，请允许弹窗后重试')
  }

  const html = `
    <!doctype html>
    <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <title>Prepreg Binding QR Print Preview</title>
      <style>
        @page { size: A4; margin: 8mm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f8fafc; color: #0f172a; font-family: "Microsoft YaHei", Arial, sans-serif; }
        .sheet { min-height: 100vh; padding: 12px; }
        .toolbar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 12px; }
        .toolbar button { border: 1px dashed #94a3b8; background: #fff; border-radius: 999px; padding: 8px 16px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .label-card { border: 1px dashed #cbd5e1; border-radius: 24px; background: #fff; padding: 14px; break-inside: avoid; }
        .label-card__meta { display: flex; justify-content: space-between; gap: 8px; font-size: 9px; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase; color: #64748b; }
        .label-card__code { margin-top: 10px; font-size: 12px; font-weight: 900; line-height: 1.5; word-break: break-all; }
        .label-card__qr-wrap { margin-top: 12px; display: flex; align-items: center; justify-content: center; border: 1px dashed #e2e8f0; border-radius: 20px; padding: 10px; background: #f8fafc; }
        .label-card__qr { width: 180px; height: 180px; object-fit: contain; }
        .label-card__tip { margin-top: 10px; font-size: 9px; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; color: #475569; }
        @media print {
          body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sheet { padding: 0; }
          .toolbar { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="toolbar">
          <button onclick="window.print()">打印 / 保存 PDF</button>
          <button onclick="window.close()">关闭</button>
        </div>
        <div class="grid">${buildCardsHtml(items)}</div>
      </div>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
}
