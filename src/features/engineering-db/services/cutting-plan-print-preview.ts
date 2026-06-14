import { type CuttingPlanInput } from '../data/cutting-plan-schema'

type PrintableRow =
  | { type: 'line'; line: CuttingPlanInput['lines'][number] }
  | { type: 'separator' }

function normalizeGroupKey(value?: string): string {
  return (value || '').replace(/\s+/g, '').toUpperCase()
}

function parseNumeric(value?: string): number {
  if (!value) return 0
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits).replace(/\.?0+$/, '')
}

function escapeHtml(value?: string): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildPrintableRows(plan: CuttingPlanInput): PrintableRow[] {
  const rows: PrintableRow[] = []
  const hasManualBreaks = plan.lines.some((line) =>
    Boolean(line.manualGroupBreakBefore)
  )

  if (hasManualBreaks) {
    plan.lines.forEach((line) => {
      if (rows.length > 0 && line.manualGroupBreakBefore)
        rows.push({ type: 'separator' })
      rows.push({ type: 'line', line })
    })
    return rows
  }

  let previousGroup = ''
  plan.lines.forEach((line) => {
    const currentGroup = normalizeGroupKey(line.yarnDirection)
    if (
      rows.length > 0 &&
      currentGroup &&
      previousGroup &&
      currentGroup !== previousGroup
    ) {
      rows.push({ type: 'separator' })
    }
    rows.push({ type: 'line', line })
    if (currentGroup) previousGroup = currentGroup
  })
  return rows
}

function buildRowsHtml(plan: CuttingPlanInput): string {
  const rows = buildPrintableRows(plan)
  return rows
    .map((item, index) => {
      if (item.type === 'separator') {
        return '<tr class="group-break"><td colspan="8"></td></tr>'
      }
      const line = item.line
      return `
        <tr>
          <td>${line.sequenceNo || index + 1}</td>
          <td>${escapeHtml(line.rollOrder)}</td>
          <td>${escapeHtml(line.yarnDirection)}</td>
          <td>${escapeHtml(line.sizeExpression)}</td>
          <td>${escapeHtml(line.faw)}</td>
          <td>${escapeHtml(line.weightG)}</td>
          <td>${escapeHtml(line.areaM2)}</td>
          <td class="text-left">${escapeHtml(line.operationNote)}</td>
        </tr>
      `
    })
    .join('')
}

export function openCuttingPlanPrintPreview(plan: CuttingPlanInput) {
  const printWindow = window.open('', '_blank', 'width=1280,height=900')
  if (!printWindow) {
    throw new Error('浏览器拦截了预览窗口，请允许弹窗后重试')
  }

  const totalWeight = plan.lines.reduce(
    (sum, line) => sum + parseNumeric(line.weightG),
    0
  )
  const totalArea = plan.lines.reduce(
    (sum, line) => sum + parseNumeric(line.areaM2),
    0
  )
  const rowsHtml = buildRowsHtml(plan)
  const title = escapeHtml(plan.name || '裁纱单')
  const prepregLabel = escapeHtml(plan.prepregSpecLabel || '--')

  const html = `
    <!doctype html>
    <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <title>${title} - 打印预览</title>
      <style>
        @page { size: A4 landscape; margin: 8mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: "Microsoft YaHei", Arial, sans-serif; color: #0f172a; background: #f8fafc; }
        .sheet { width: 100%; min-height: 100vh; padding: 12px; background: #fff; }
        .toolbar { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 10px; }
        .toolbar button { border: 1px solid #cbd5e1; background: #fff; border-radius: 999px; padding: 6px 14px; font-weight: 700; cursor: pointer; }
        .header-grid { width: 100%; border-collapse: collapse; }
        .header-grid td { border: 1px solid #94a3b8; padding: 6px 8px; font-size: 12px; }
        .title { text-align: center; font-size: 20px; font-weight: 900; }
        .subtitle { text-align: center; color: #334155; font-size: 12px; margin-top: 2px; }
        .section-title { margin-top: 10px; font-size: 13px; font-weight: 800; text-align: center; }
        table.main { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.main th, table.main td { border: 1px solid #94a3b8; padding: 5px 6px; font-size: 12px; text-align: center; }
        table.main th { background: #0f172a; color: #fff; font-weight: 800; }
        table.main td.text-left { text-align: left; }
        tr.group-break td { background: #fff200; height: 10px; padding: 0; }
        .summary { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .summary .box { border: 1px solid #94a3b8; padding: 6px 8px; font-size: 12px; }
        .sign-grid { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .sign-grid td { border: 1px solid #94a3b8; padding: 8px; font-size: 12px; text-align: center; }
        @media print {
          body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .toolbar { display: none; }
          .sheet { padding: 0; min-height: auto; }
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="toolbar">
          <button onclick="window.print()">打印 / 保存 PDF</button>
          <button onclick="window.close()">关闭</button>
        </div>

        <table class="header-grid">
          <tr>
            <td rowspan="3" style="width: 28%; text-align: center; font-weight: 800;">企业平台</td>
            <td rowspan="3" style="width: 28%;">
              <div class="title">${title}</div>
              <div class="subtitle">${escapeHtml(plan.holeCount ? `${plan.holeCount}孔` : '')}</div>
            </td>
            <td style="width: 12%; text-align: center; font-weight: 700;">文件编号</td>
            <td style="width: 32%;">${escapeHtml(plan.documentNo || '--')}</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: 700;">版次</td>
            <td>${escapeHtml(plan.revisionNo || '--')}</td>
          </tr>
          <tr>
            <td style="text-align: center; font-weight: 700;">生效日期</td>
            <td>${escapeHtml(plan.effectiveDate || '--')}</td>
          </tr>
        </table>

        <div class="section-title">技术文件（预浸料：${prepregLabel}）</div>
        <table class="header-grid">
          <tr>
            <td style="width: 40%;">碳丝型号：${escapeHtml(plan.carbonFiberModel || '--')}</td>
            <td style="width: 30%;">树脂型号：${escapeHtml(plan.resinModel || '--')}</td>
            <td style="width: 30%;">RC含量：${escapeHtml(plan.resinContentPercent || '--')}</td>
          </tr>
        </table>

        <table class="main">
          <thead>
            <tr>
              <th style="width: 7%;">序号</th>
              <th style="width: 10%;">卷制顺序</th>
              <th style="width: 12%;">纱别</th>
              <th style="width: 18%;">宽*长*片</th>
              <th style="width: 9%;">FAW</th>
              <th style="width: 10%;">重量(g)</th>
              <th style="width: 10%;">面积(m2)</th>
              <th>操作说明</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="height:48px;color:#64748b;">暂无裁片数据</td></tr>'}
            <tr>
              <td colspan="5" style="font-weight: 800;">合计</td>
              <td style="font-weight: 800;">${formatNumber(totalWeight, 2)}</td>
              <td style="font-weight: 800;">${formatNumber(totalArea, 3)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div class="summary">
          <div class="box">裁纱裁切尺寸公差：±0.5mm</div>
          <div class="box">搭接拼层尺寸公差：±2mm</div>
          <div class="box">内圈材料重(g)：${escapeHtml(plan.totalInnerMaterialWeightG || '--')}</div>
          <div class="box">材料总重(g)：${escapeHtml(plan.totalMaterialWeightG || formatNumber(totalWeight, 2))}</div>
        </div>

        <table class="sign-grid">
          <tr>
            <td>制定单位</td>
            <td>开发</td>
            <td>收文单位</td>
            <td>裁纱</td>
          </tr>
          <tr>
            <td>校准</td>
            <td>审核</td>
            <td>制表</td>
            <td>制定日期 ${escapeHtml(plan.effectiveDate || '--')}</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
}
