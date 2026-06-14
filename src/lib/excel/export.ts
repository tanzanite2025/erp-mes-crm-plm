import type { Alignment, Borders, Row, Workbook } from 'exceljs'
import { loadExcelJS } from '@/lib/lazy-vendors'

const EXCEL_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export const EXCEL_THIN_BORDER: Partial<Borders> = {
  top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
}

export const EXCEL_LIGHT_THIN_BORDER = EXCEL_THIN_BORDER

export const EXCEL_CENTER_ALIGNMENT: Partial<Alignment> = {
  vertical: 'middle',
  horizontal: 'center',
  wrapText: true,
}

type WorkbookBufferWriter = Pick<Workbook, 'xlsx'>

type HeaderRowStyleOptions = {
  fillColorArgb?: string
  fontColorArgb?: string
  fontSize?: number
}

export async function createExcelWorkbook() {
  const { default: ExcelJS } = await loadExcelJS()
  return new ExcelJS.Workbook()
}

export async function downloadWorkbook(
  workbook: WorkbookBufferWriter,
  filename: string
) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: EXCEL_MIME_TYPE })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}

export function applyWorksheetHeaderRowStyle(
  row: Row,
  options: HeaderRowStyleOptions = {}
) {
  const {
    fillColorArgb = 'FF1E40AF',
    fontColorArgb = 'FFFFFFFF',
    fontSize = 10,
  } = options

  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: fontColorArgb }, size: fontSize }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: fillColorArgb },
    }
    cell.border = EXCEL_THIN_BORDER
    cell.alignment = EXCEL_CENTER_ALIGNMENT
  })
}
