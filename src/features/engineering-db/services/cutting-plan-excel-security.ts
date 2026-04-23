import type { Cell, Workbook } from 'exceljs'
import { CUTTING_PLAN_EXCEL_LIMITS } from './cutting-plan-excel-contract'

export const escapeFormula = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  if (value.length > 0 && ['=', '+', '-', '@'].includes(value[0])) {
    return `'${value}`
  }
  return value
}

const unescapeFormula = (value: string): string => {
  if (!value) return value
  if (value.length > 1 && value[0] === "'" && ['=', '+', '-', '@'].includes(value[1])) {
    return value.slice(1)
  }
  return value
}

export const validateCuttingPlanFileSize = (file: File) => {
  if (file.size > CUTTING_PLAN_EXCEL_LIMITS.maxFileSize) {
    throw new Error(`Excel 文件过大 (${(file.size / 1024 / 1024).toFixed(2)}MB)，请控制在 10MB 以内。`)
  }
}

export const validateCuttingPlanWorkbookSheetCount = (workbook: Workbook) => {
  if (workbook.worksheets.length > CUTTING_PLAN_EXCEL_LIMITS.maxSheets) {
    throw new Error(`Excel Sheet 数量过多 (${workbook.worksheets.length})，请使用系统模板导入。`)
  }
}

export const safelyGetCellValue = (cell: Cell): string => {
  const raw = cell.value
  if (raw == null) return ''

  if (typeof raw === 'object') {
    if ('result' in raw) return unescapeFormula(raw.result?.toString().trim() || '')
    if ('richText' in raw && Array.isArray(raw.richText)) {
      return unescapeFormula(raw.richText.map((segment: { text: string }) => segment.text).join('').trim())
    }
    if ('text' in raw) return unescapeFormula((raw as { text?: string }).text?.toString().trim() || '')
    return ''
  }

  return unescapeFormula(String(raw).trim())
}

export const normalizeCellText = (value: string): string => {
  return value
    .replace(/\u3000/g, ' ')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
