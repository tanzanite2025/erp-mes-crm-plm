import { loadExcelJS } from '@/lib/lazy-vendors'
import type { Borders, Workbook } from 'exceljs'
import { formatEngineeringExportFileDate } from '@/features/engineering/utils/engineering-export-file-date'
import { type CuttingPlanInput } from '../data/cutting-plan-schema'
import {
  CUTTING_PLAN_EXCEL_LIMITS,
  CUTTING_PLAN_EXCEL_LOCK_PASSWORDS,
  CUTTING_PLAN_EXCEL_SHEETS,
} from './cutting-plan-excel-contract'
import { escapeFormula } from './cutting-plan-excel-security'

async function downloadWorkbook(workbook: Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.URL.revokeObjectURL(url)
}

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

export async function generateCuttingPlanImportTemplate() {
  const { default: ExcelJS } = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(CUTTING_PLAN_EXCEL_SHEETS.import, {
    views: [{ state: 'frozen', ySplit: 2 }],
  })

  sheet.columns = [
    { header: '序号(锁定)', key: 'sequence', width: 11 },
    { header: '文件编号', key: 'documentNo', width: 16 },
    { header: '版次', key: 'revisionNo', width: 10 },
    { header: '生效日期', key: 'effectiveDate', width: 14 },
    { header: '产品编码', key: 'productCode', width: 16 },
    { header: '产品型号*', key: 'productName', width: 22 },
    { header: '孔数*', key: 'holeCount', width: 12 },
    { header: '碳丝型号', key: 'carbonFiberModel', width: 28 },
    { header: '树脂型号', key: 'resinModel', width: 18 },
    { header: 'RC含量', key: 'resinContentPercent', width: 12 },
    { header: '卷制顺序', key: 'rollOrder', width: 12 },
    { header: '纱别', key: 'yarnDirection', width: 16 },
    { header: '尺寸库编码*', key: 'cutSizeCode', width: 18 },
    { header: '操作说明', key: 'operationNote', width: 36 },
    { header: '分组标记(填#BREAK)', key: 'manualBreak', width: 20 },
    { header: '状态', key: 'status', width: 12 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.height = 26
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

  sheet.mergeCells('A2:P2')
  const guideCell = sheet.getCell('A2')
  guideCell.value =
    '导入说明：方案名称由“产品型号 + 孔数”自动生成，不需要填写名称列；每行必须填写尺寸库编码，并且该编码必须已在尺寸库中启用；黄色分组条请在“分组标记”列填 #BREAK。'
  guideCell.font = { bold: true, size: 10, color: { argb: 'FFB91C1C' } }
  guideCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } }
  guideCell.alignment = { vertical: 'middle', horizontal: 'left' }
  sheet.getRow(2).height = 24

  const defaultBorder = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  } satisfies Pick<Borders, 'top' | 'left' | 'bottom' | 'right'>

  for (
    let rowNumber = 3;
    rowNumber <= CUTTING_PLAN_EXCEL_LIMITS.templateRows + 2;
    rowNumber += 1
  ) {
    const row = sheet.getRow(rowNumber)
    row.height = 22
    row.getCell(1).value = { formula: 'ROW()-2' }
    row.getCell(1).protection = { locked: true }
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }

    for (let col = 1; col <= 16; col += 1) {
      row.getCell(col).border = defaultBorder
    }

    for (let col = 2; col <= 16; col += 1) {
      row.getCell(col).protection = { locked: false }
    }

    row.getCell(7).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"14,16,18,20,21,24,28,32"'],
    }

    row.getCell(15).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"#BREAK,BREAK,分组,分割,黄条"'],
    }

    row.getCell(16).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Draft,Active,Archived"'],
    }
  }

  await sheet.protect(CUTTING_PLAN_EXCEL_LOCK_PASSWORDS.importSheet, {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: true,
    insertRows: true,
    deleteRows: true,
  })

  const date = formatEngineeringExportFileDate()
  await downloadWorkbook(workbook, `XDFC_CuttingPlan_Import_${date}.xlsx`)
}

export async function exportCuttingPlanPrintWorkbook(plan: CuttingPlanInput) {
  const { default: ExcelJS } = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(CUTTING_PLAN_EXCEL_SHEETS.print, {
    views: [{ state: 'frozen', ySplit: 7 }],
  })

  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: {
      left: 0.3,
      right: 0.3,
      top: 0.35,
      bottom: 0.35,
      header: 0.2,
      footer: 0.2,
    },
  }

  sheet.columns = [
    { header: '序号', width: 8 },
    { header: '卷制顺序', width: 12 },
    { header: '纱别', width: 18 },
    { header: '宽*长*片', width: 20 },
    { header: 'FAW', width: 10 },
    { header: '重量(g)', width: 12 },
    { header: '面积(m2)', width: 12 },
    { header: '操作说明', width: 42 },
  ]

  sheet.mergeCells('A1:C3')
  sheet.mergeCells('D1:F3')
  sheet.mergeCells('A4:H4')
  sheet.mergeCells('A5:C5')
  sheet.mergeCells('D5:F5')
  sheet.mergeCells('G5:H5')

  sheet.getCell('A1').value = '纤镀复材科技（厦门）有限公司'
  sheet.getCell('D1').value = escapeFormula(plan.name || '普通款-裁纱单')
  sheet.getCell('G1').value = '文件编号'
  sheet.getCell('H1').value = escapeFormula(plan.documentNo || '--')
  sheet.getCell('G2').value = '版次'
  sheet.getCell('H2').value = escapeFormula(plan.revisionNo || '--')
  sheet.getCell('G3').value = '生效日期'
  sheet.getCell('H3').value = escapeFormula(plan.effectiveDate || '--')
  sheet.getCell('A4').value = `技术文件（预浸料：${escapeFormula(plan.prepregSpecLabel || '--')}）`
  sheet.getCell('A5').value = `碳丝型号：${escapeFormula(plan.carbonFiberModel || '--')}`
  sheet.getCell('D5').value = `树脂型号：${escapeFormula(plan.resinModel || '--')}`
  sheet.getCell('G5').value = `RC含量：${escapeFormula(plan.resinContentPercent || '--')}`

  sheet.getRow(1).height = 30
  sheet.getRow(2).height = 24
  sheet.getRow(3).height = 24
  sheet.getRow(4).height = 22
  sheet.getRow(5).height = 22
  sheet.getCell('A1').font = { bold: true, size: 14 }
  sheet.getCell('D1').font = { bold: true, size: 14 }
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  sheet.getCell('D1').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  sheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getCell('A4').font = { bold: true, size: 11 }

  ;['G1', 'G2', 'G3'].forEach((cellRef) => {
    const cell = sheet.getCell(cellRef)
    cell.font = { bold: true, size: 10 }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  ;['H1', 'H2', 'H3'].forEach((cellRef) => {
    const cell = sheet.getCell(cellRef)
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  const tableHeaderRow = 6
  const tableHeaders = [
    '序号',
    '卷制顺序',
    '纱别',
    '宽*长*片',
    'FAW',
    '重量(g)',
    '面积(m2)',
    '操作说明',
  ]
  tableHeaders.forEach((header, idx) => {
    const cell = sheet.getCell(tableHeaderRow, idx + 1)
    cell.value = header
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  const printableRows: Array<
    { type: 'line'; line: CuttingPlanInput['lines'][number] } | { type: 'separator' }
  > = []
  const hasManualBreaks = plan.lines.some((line) => Boolean(line.manualGroupBreakBefore))

  if (hasManualBreaks) {
    plan.lines.forEach((line) => {
      if (printableRows.length > 0 && line.manualGroupBreakBefore) {
        printableRows.push({ type: 'separator' })
      }
      printableRows.push({ type: 'line', line })
    })
  } else {
    let previousGroup = ''
    plan.lines.forEach((line) => {
      const currentGroup = normalizeGroupKey(line.yarnDirection)
      if (
        printableRows.length > 0 &&
        currentGroup &&
        previousGroup &&
        currentGroup !== previousGroup
      ) {
        printableRows.push({ type: 'separator' })
      }
      printableRows.push({ type: 'line', line })
      if (currentGroup) previousGroup = currentGroup
    })
  }

  const rowStart = tableHeaderRow + 1
  let cursor = rowStart
  printableRows.forEach((item, index) => {
    const row = sheet.getRow(cursor)
    if (item.type === 'separator') {
      row.height = 12
      for (let col = 1; col <= 8; col += 1) {
        row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }
      }
      cursor += 1
      return
    }

    const line = item.line
    row.height = 22
    row.getCell(1).value = line.sequenceNo || index + 1
    row.getCell(2).value = escapeFormula(line.rollOrder || '')
    row.getCell(3).value = escapeFormula(line.yarnDirection || '')
    row.getCell(4).value = escapeFormula(line.sizeExpression || '')
    row.getCell(5).value = escapeFormula(line.faw || '')
    row.getCell(6).value = escapeFormula(line.weightG || '')
    row.getCell(7).value = escapeFormula(line.areaM2 || '')
    row.getCell(8).value = escapeFormula(line.operationNote || '')
    row.getCell(8).alignment = { wrapText: true, vertical: 'middle' }
    cursor += 1
  })

  const totalWeight = plan.lines.reduce((sum, line) => sum + parseNumeric(line.weightG), 0)
  const totalArea = plan.lines.reduce((sum, line) => sum + parseNumeric(line.areaM2), 0)

  const totalRow = cursor
  sheet.mergeCells(`A${totalRow}:E${totalRow}`)
  sheet.getCell(`A${totalRow}`).value = '合计'
  sheet.getCell(`A${totalRow}`).font = { bold: true }
  sheet.getCell(`F${totalRow}`).value = formatNumber(totalWeight, 2)
  sheet.getCell(`G${totalRow}`).value = formatNumber(totalArea, 3)

  const toleranceRow = totalRow + 2
  sheet.mergeCells(`A${toleranceRow}:D${toleranceRow}`)
  sheet.mergeCells(`E${toleranceRow}:H${toleranceRow}`)
  sheet.getCell(`A${toleranceRow}`).value = '裁纱裁切尺寸公差：±0.5mm'
  sheet.getCell(`E${toleranceRow}`).value = '搭接拼层尺寸公差：±2mm'

  const summaryRow = toleranceRow + 1
  sheet.mergeCells(`A${summaryRow}:D${summaryRow}`)
  sheet.mergeCells(`E${summaryRow}:H${summaryRow}`)
  sheet.getCell(`A${summaryRow}`).value = `内圈材料重(g)：${escapeFormula(plan.totalInnerMaterialWeightG || '--')}`
  sheet.getCell(`E${summaryRow}`).value = `材料总重(g)：${escapeFormula(plan.totalMaterialWeightG || formatNumber(totalWeight, 2))}`

  const usageRow = summaryRow + 1
  sheet.mergeCells(`A${usageRow}:H${usageRow}`)
  sheet.getCell(`A${usageRow}`).value = `材料总用量(m²)：${formatNumber(totalArea, 4)}`

  const signHeaderRow = usageRow + 2
  const signValueRow = signHeaderRow + 1
  const signTailRow = signValueRow + 1
  const signItems: Array<[string, string]> = [
    ['A', '制定单位'],
    ['C', '开发'],
    ['E', '收文单位'],
    ['G', '裁纱'],
  ]
  signItems.forEach(([col, label]) => {
    sheet.mergeCells(`${col}${signHeaderRow}:${String.fromCharCode(col.charCodeAt(0) + 1)}${signHeaderRow}`)
    sheet.getCell(`${col}${signHeaderRow}`).value = label
    sheet.getCell(`${col}${signHeaderRow}`).alignment = { horizontal: 'center', vertical: 'middle' }
    sheet.getCell(`${col}${signHeaderRow}`).font = { bold: true, size: 10 }
  })

  sheet.mergeCells(`A${signValueRow}:B${signValueRow}`)
  sheet.mergeCells(`C${signValueRow}:D${signValueRow}`)
  sheet.mergeCells(`E${signValueRow}:F${signValueRow}`)
  sheet.mergeCells(`G${signValueRow}:H${signValueRow}`)
  sheet.getCell(`A${signValueRow}`).value = '校准'
  sheet.getCell(`C${signValueRow}`).value = '审核'
  sheet.getCell(`E${signValueRow}`).value = '制表'
  sheet.getCell(`G${signValueRow}`).value = `制定日期 ${escapeFormula(plan.effectiveDate || '--')}`

  sheet.mergeCells(`A${signTailRow}:B${signTailRow}`)
  sheet.mergeCells(`C${signTailRow}:D${signTailRow}`)
  sheet.mergeCells(`E${signTailRow}:F${signTailRow}`)
  sheet.mergeCells(`G${signTailRow}:H${signTailRow}`)
  sheet.getCell(`E${signTailRow}`).value = '修改日期'
  sheet.getCell(`G${signTailRow}`).value = '修改说明'

  const borderRangeEndRow = signTailRow
  const border = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  } satisfies Pick<Borders, 'top' | 'left' | 'bottom' | 'right'>

  for (let row = tableHeaderRow; row <= borderRangeEndRow; row += 1) {
    for (let col = 1; col <= 8; col += 1) {
      const cell = sheet.getCell(row, col)
      cell.border = border
      if (row > tableHeaderRow && row <= totalRow) {
        sheet.getCell(row, col).alignment = {
          horizontal: col === 8 ? 'left' : 'center',
          vertical: 'middle',
          wrapText: col === 8,
        }
      }
    }
  }

  for (let row = toleranceRow; row <= signTailRow; row += 1) {
    sheet.getRow(row).height = 22
    sheet.getCell(`A${row}`).alignment = { horizontal: 'left', vertical: 'middle' }
    sheet.getCell(`E${row}`).alignment = { horizontal: 'left', vertical: 'middle' }
  }

  const date = formatEngineeringExportFileDate()
  const fileName = plan.documentNo
    ? `CuttingPlan_Print_${plan.documentNo}_${date}.xlsx`
    : `CuttingPlan_Print_${date}.xlsx`
  await downloadWorkbook(workbook, fileName)
}
