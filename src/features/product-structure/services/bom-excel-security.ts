import type { Cell, Workbook } from 'exceljs'
import { BOM_EXCEL_LIMITS } from './bom-excel-contract'

/**
 * 预防 Excel 公式注入 (CSV Injection / Formula Injection)
 * 如果值是以 =, +, -, @ 开头的字符串，则在前置增加 ' (单引号) 强制作为文本处理
 */
export const escapeFormula = (val: unknown): unknown => {
  if (typeof val !== 'string') return val
  if (val.length > 0 && ['=', '+', '-', '@'].includes(val[0])) {
    return `'${val}`
  }
  return val
}

/**
 * 反转义：还原被公式注入防护前置的单引号
 * 仅当值以 "'" 开头且下一个字符是公式触发符号时才处理
 */
export const unescapeFormula = (val: string): string => {
  if (!val) return val
  if (
    val.length > 1 &&
    val[0] === "'" &&
    ['=', '+', '-', '@'].includes(val[1])
  ) {
    return val.slice(1)
  }
  return val
}

export const validateBOMFileSize = (file: File) => {
  if (file.size > BOM_EXCEL_LIMITS.maxFileSize) {
    throw new Error(
      `文件体积过大 (${(file.size / 1024 / 1024).toFixed(2)}MB)，上限为 10MB。请检查是否上传了错误的超大附件。`
    )
  }
}

export const validateBOMWorkbookSheetCount = (workbook: Workbook) => {
  if (workbook.worksheets.length > BOM_EXCEL_LIMITS.maxSheets) {
    throw new Error(
      `工作簿包含过多的 Sheet (${workbook.worksheets.length} 个)，存在解析风险。请使用标准模板。`
    )
  }
}

/**
 * 防穿透提取：应对用户从外部带有样式、富文本的网页或文档直接原样“粘贴至此”形成的异形 JS 对象
 */
export const safelyGetCellValue = (cell: Cell): string => {
  const val = cell.value
  if (val === null || val === undefined) return ''

  if (typeof val === 'object') {
    if ('result' in val)
      return unescapeFormula(val.result?.toString().trim() || '')
    if ('richText' in val && Array.isArray(val.richText)) {
      return unescapeFormula(
        val.richText
          .map((t: { text: string }) => t.text)
          .join('')
          .trim()
      )
    }
    if ('text' in val)
      return unescapeFormula(
        (val as { text?: string }).text?.toString().trim() || ''
      )
    if ('error' in val) return ''
    return ''
  }

  return unescapeFormula(String(val).trim())
}
