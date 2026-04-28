type OpenPrepregSpecQrPrintPreviewOptions = {
  title: string
  contentHtml: string
  printLabel: string
  closeLabel: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function openPrepregSpecQrPrintPreview(options: OpenPrepregSpecQrPrintPreviewOptions) {
  const printWindow = window.open('', '_blank', 'width=900,height=760')
  if (!printWindow) {
    throw new Error('浏览器拦截了打印预览窗口，请允许弹窗后重试')
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(options.title)}</title>
      <style>
        @page { size: auto; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #f8fafc; color: #0f172a; font-family: "Microsoft YaHei", Arial, sans-serif; }
        .sheet { min-height: 100vh; padding: 16px; }
        .toolbar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 12px; }
        .toolbar button { border: 1px dashed #94a3b8; background: #fff; border-radius: 999px; padding: 8px 16px; font-size: 12px; font-weight: 800; cursor: pointer; }
        .preview { max-width: 720px; margin: 0 auto; border: 1px dashed #cbd5e1; border-radius: 28px; background: #fff; padding: 20px; }
        .preview img { display: block; }
        @media print {
          body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sheet { padding: 0; }
          .toolbar { display: none; }
          .preview { max-width: none; border: none; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="toolbar">
          <button onclick="window.print()">${escapeHtml(options.printLabel)}</button>
          <button onclick="window.close()">${escapeHtml(options.closeLabel)}</button>
        </div>
        <div class="preview">${options.contentHtml}</div>
      </div>
    </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
}
