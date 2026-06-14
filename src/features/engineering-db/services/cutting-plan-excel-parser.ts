import { loadExcelJS } from '@/lib/lazy-vendors'
import { type CutSizeUnit } from '@/features/raw-materials/cut-size-library/data/cut-size-library-schema'
import {
  buildCuttingPlanInput,
  EMPTY_CUTTING_PLAN_INPUT,
  syncCuttingPlanLineWithCutSizeUnit,
  type CuttingPlanInput,
  type CuttingPlanStatus,
} from '../data/cutting-plan-schema'
import {
  CUTTING_PLAN_EXCEL_LIMITS,
  CUTTING_PLAN_EXCEL_SHEETS,
} from './cutting-plan-excel-contract'
import {
  normalizeCellText,
  safelyGetCellValue,
  validateCuttingPlanFileSize,
  validateCuttingPlanWorkbookSheetCount,
} from './cutting-plan-excel-security'

const STATUS_ALIAS_MAP: Record<string, CuttingPlanStatus> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
  草稿: 'Draft',
  启用: 'Active',
  归档: 'Archived',
}

const MANUAL_BREAK_MARKERS = new Set([
  '#BREAK',
  'BREAK',
  '分组',
  '分割',
  '黄条',
])

type HeaderSnapshot = {
  documentNo: string
  revisionNo: string
  effectiveDate: string
  productCode: string
  productName: string
  holeCount: string
  carbonFiberModel: string
  resinModel: string
  resinContentPercent: string
  status: string
}

const EMPTY_HEADER: HeaderSnapshot = {
  documentNo: '',
  revisionNo: '',
  effectiveDate: '',
  productCode: '',
  productName: '',
  holeCount: '',
  carbonFiberModel: '',
  resinModel: '',
  resinContentPercent: '',
  status: '',
}

function resolveStatus(value: string): CuttingPlanStatus {
  const normalized = normalizeCellText(value).toUpperCase()
  return STATUS_ALIAS_MAP[normalized] || 'Draft'
}

function resolveManualBreak(value: string): boolean {
  const normalized = normalizeCellText(value).toUpperCase()
  return MANUAL_BREAK_MARKERS.has(normalized)
}

function hasLineContent(lineFields: string[]): boolean {
  return lineFields.some((field) => normalizeCellText(field) !== '')
}

function requireHeaderValue(
  value: string,
  rowNumber: number,
  fieldLabel: string
): string {
  if (value) return value
  throw new Error(`第 ${rowNumber} 行缺少“${fieldLabel}”，无法导入。`)
}

function normalizeCutSizeCodeKey(value: string): string {
  return value.trim().toLowerCase()
}

function findMatchedCutSizeUnitByCode(
  cutSizeCode: string,
  cutSizeUnits: CutSizeUnit[],
  rowNumber: number
): CutSizeUnit {
  const normalizedCode = normalizeCutSizeCodeKey(cutSizeCode)
  const matches = cutSizeUnits.filter(
    (item) => normalizeCutSizeCodeKey(item.code) === normalizedCode
  )

  if (matches.length === 1) {
    return matches[0]
  }

  if (matches.length > 1) {
    throw new Error(
      `第 ${rowNumber} 行的尺寸库编码“${cutSizeCode}”匹配到多个条目，请先清理尺寸库重复定义。`
    )
  }

  throw new Error(
    `第 ${rowNumber} 行的尺寸库编码“${cutSizeCode}”未在尺寸库中启用，必须先在尺寸库建立并启用后才能导入裁纱单。`
  )
}

export async function parseCuttingPlanImportExcel(
  file: File,
  cutSizeUnits: CutSizeUnit[]
): Promise<CuttingPlanInput> {
  validateCuttingPlanFileSize(file)

  const { default: ExcelJS } = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  const arrayBuffer = await file.arrayBuffer()

  try {
    await workbook.xlsx.load(arrayBuffer)
  } catch {
    throw new Error('Excel 文件格式不正确或已损坏，无法解析。')
  }

  validateCuttingPlanWorkbookSheetCount(workbook)

  const sheet =
    workbook.getWorksheet(CUTTING_PLAN_EXCEL_SHEETS.import) ||
    workbook.getWorksheet(1)
  if (!sheet) {
    throw new Error('未找到导入工作表，请使用系统模板。')
  }

  const header: HeaderSnapshot = { ...EMPTY_HEADER }
  const lines: CuttingPlanInput['lines'] = []
  let rowLimitExceeded = false

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 2) return
    if (rowNumber > CUTTING_PLAN_EXCEL_LIMITS.maxRows) {
      rowLimitExceeded = true
      return
    }

    const rowHeader: HeaderSnapshot = {
      documentNo: normalizeCellText(safelyGetCellValue(row.getCell(2))),
      revisionNo: normalizeCellText(safelyGetCellValue(row.getCell(3))),
      effectiveDate: normalizeCellText(safelyGetCellValue(row.getCell(4))),
      productCode: normalizeCellText(safelyGetCellValue(row.getCell(5))),
      productName: normalizeCellText(safelyGetCellValue(row.getCell(6))),
      holeCount: normalizeCellText(safelyGetCellValue(row.getCell(7))),
      carbonFiberModel: normalizeCellText(safelyGetCellValue(row.getCell(8))),
      resinModel: normalizeCellText(safelyGetCellValue(row.getCell(9))),
      resinContentPercent: normalizeCellText(
        safelyGetCellValue(row.getCell(10))
      ),
      status: normalizeCellText(safelyGetCellValue(row.getCell(16))),
    }

    const lineFields = [
      safelyGetCellValue(row.getCell(11)),
      safelyGetCellValue(row.getCell(12)),
      safelyGetCellValue(row.getCell(13)),
      safelyGetCellValue(row.getCell(14)),
    ]

    Object.entries(rowHeader).forEach(([key, fieldValue]) => {
      if (fieldValue) {
        header[key as keyof HeaderSnapshot] = fieldValue
      }
    })

    if (!hasLineContent(lineFields)) return

    const productName = requireHeaderValue(
      rowHeader.productName || header.productName,
      rowNumber,
      '产品型号'
    )
    const holeCount = requireHeaderValue(
      rowHeader.holeCount || header.holeCount,
      rowNumber,
      '孔数'
    )
    const productCode = rowHeader.productCode || header.productCode

    if (!productName && !productCode) {
      throw new Error(
        `第 ${rowNumber} 行缺少产品型号/产品编码，无法生成方案名称。`
      )
    }

    const line = {
      id: crypto.randomUUID(),
      sequenceNo: lines.length + 1,
      rollOrder: normalizeCellText(lineFields[0]),
      yarnDirection: normalizeCellText(lineFields[1]),
      cutSizeCode: normalizeCellText(lineFields[2]),
      operationNote: normalizeCellText(lineFields[3]),
      manualGroupBreakBefore: resolveManualBreak(
        normalizeCellText(safelyGetCellValue(row.getCell(15)))
      ),
    }

    if (!line.cutSizeCode) {
      throw new Error(`第 ${rowNumber} 行缺少“尺寸库编码”，无法导入。`)
    }

    const matchedUnit = findMatchedCutSizeUnitByCode(
      line.cutSizeCode,
      cutSizeUnits,
      rowNumber
    )

    header.productName = productName
    header.productCode = productCode
    header.holeCount = holeCount
    lines.push(
      syncCuttingPlanLineWithCutSizeUnit(
        {
          ...line,
          cutSizeId: matchedUnit.id,
          cutSizeCode: matchedUnit.code,
          cutSizeName: matchedUnit.name,
        },
        matchedUnit
      )
    )
  })

  if (rowLimitExceeded) {
    throw new Error(
      `导入行数超过 ${CUTTING_PLAN_EXCEL_LIMITS.maxRows} 行上限，请拆分后导入。`
    )
  }

  if (lines.length === 0) {
    throw new Error('模板中没有可导入的裁片行。')
  }

  if (!header.productName && !header.productCode) {
    throw new Error('缺少产品型号/产品编码，无法生成方案名称。')
  }

  if (!header.holeCount) {
    throw new Error('缺少孔数，无法生成方案名称。')
  }

  return buildCuttingPlanInput(
    {
      ...EMPTY_CUTTING_PLAN_INPUT,
      ...header,
      status: resolveStatus(header.status),
      lines,
    },
    cutSizeUnits
  )
}
