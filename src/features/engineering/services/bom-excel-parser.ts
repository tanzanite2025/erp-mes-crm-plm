import { loadExcelJS } from '@/lib/lazy-vendors'
import { type MaterialOption } from '../../material-archive/data/schema'
import { type BOMItem } from '../data/schema'
import { type BOMItemDraft, type MaterialOptionDraft } from '../mutation-types'
import { BOM_DEFAULT_SECTION, BOM_EXCEL_LIMITS, BOM_EXCEL_SHEETS } from './bom-excel-contract'
import { safelyGetCellValue, validateBOMFileSize, validateBOMWorkbookSheetCount } from './bom-excel-security'

export interface ParsedBOMExcelResult {
  items: BOMItemDraft[]
  productId?: string
  materials?: MaterialOptionDraft[]
}

/**
 * 极速导入双 Sheet 引擎
 */
export const parseBOMExcel = async (file: File): Promise<ParsedBOMExcelResult> => {
  // 1. 文件体积前置校验 (DoS 防御)
  validateBOMFileSize(file)

  const { default: ExcelJS } = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  const arrayBuffer = await file.arrayBuffer()

  try {
    await workbook.xlsx.load(arrayBuffer)
  } catch {
    throw new Error('Excel 文件损坏或格式不受支持，无法解析。')
  }

  // 2. 结构复杂性校验
  validateBOMWorkbookSheetCount(workbook)

  // 1. 读取隐藏沙盒提取密钥字典
  const archiveSheet =
    workbook.getWorksheet(BOM_EXCEL_SHEETS.archive) || workbook.getWorksheet(BOM_EXCEL_SHEETS.legacyArchive)
  const comboToIdMap = new Map<string, string>()
  const productComboToIdMap = new Map<string, string>()
  const extractedMaterials: MaterialOptionDraft[] = []
  let archiveRowExceeded = false

  if (archiveSheet) {
    archiveSheet.eachRow((row, rowNumber) => {
      if (rowNumber > BOM_EXCEL_LIMITS.maxRows) {
        archiveRowExceeded = true
        return
      }
      if (rowNumber === 1) return

      // 物料映射与数据提取
      const mCombo = safelyGetCellValue(row.getCell(1))
      const mId = safelyGetCellValue(row.getCell(2))
      const mName = safelyGetCellValue(row.getCell(3))
      const mSpec = safelyGetCellValue(row.getCell(4))
      const mUnit = safelyGetCellValue(row.getCell(5))
      const mPrice = parseFloat(safelyGetCellValue(row.getCell(6)))
      const mCategory = safelyGetCellValue(row.getCell(7))

      if (mCombo && mId) {
        comboToIdMap.set(mCombo, mId)
        if (mName) {
          const mCode = mCombo.match(/\[(.*?)\]/)?.[1] || mId
          if (!extractedMaterials.find((x) => x.id === mId)) {
            extractedMaterials.push({
              id: mId,
              code: mCode,
              name: mName,
              spec: mSpec,
              uom: mUnit || 'pcs',
              costPrice: isNaN(mPrice) ? 0 : mPrice,
              category: mCategory || 'RAW_MATERIAL',
            })
          }
        }
      }

      // 产品映射
      const pCombo = safelyGetCellValue(row.getCell(8))
      const pId = safelyGetCellValue(row.getCell(9))
      if (pCombo && pId) productComboToIdMap.set(pCombo, pId)
    })
  }

  if (archiveRowExceeded) {
    throw new Error(`系统档案行数超过 ${BOM_EXCEL_LIMITS.maxRows} 行上限，请联系管理员或分批下载导入。`)
  }

  // 2. 爬取填报视图
  const mainSheet = workbook.getWorksheet(BOM_EXCEL_SHEETS.main) || workbook.getWorksheet(1)
  if (!mainSheet) return { items: [] }

  const items: BOMItemDraft[] = []
  let resolvedProductId: string | undefined
  let mainRowExceeded = false

  // 跳过表头，提取有效填报
  mainSheet.eachRow((row, rowNumber) => {
    if (rowNumber > BOM_EXCEL_LIMITS.maxRows) {
      mainRowExceeded = true
      return
    }
    if (rowNumber === 1) return

    // 记录已选择的产品型号
    const pComboText = safelyGetCellValue(row.getCell(1))
    if (pComboText && productComboToIdMap.has(pComboText)) {
      resolvedProductId = productComboToIdMap.get(pComboText)
    }

    const comboText = safelyGetCellValue(row.getCell(3))
    const unitUsageStr = safelyGetCellValue(row.getCell(6))
    const unitPriceStr = safelyGetCellValue(row.getCell(5))
    const section = safelyGetCellValue(row.getCell(2)) || BOM_DEFAULT_SECTION
    const wastageStr = safelyGetCellValue(row.getCell(7)) || '0'

    // 核心防护：判断该行是否有实质性业务数据
    const hasSignificantData =
      (unitUsageStr && unitUsageStr !== '0') ||
      (unitPriceStr && unitPriceStr !== '0') ||
      (wastageStr && wastageStr !== '0')

    if (!comboText) {
      if (hasSignificantData) {
        throw new Error(`解析在第 ${rowNumber} 行中断：发现业务数据但未指定物料！`)
      }
      return
    }

    // UUID 映射
    const materialId = comboToIdMap.get(comboText)
    if (!materialId) {
      throw new Error(`解析在第 ${rowNumber} 行中断：未知的物料 "${comboText}"。请确保从下拉框选择。`)
    }

    const unitUsage = parseFloat(unitUsageStr)
    if (!unitUsageStr || isNaN(unitUsage) || unitUsage <= 0) {
      throw new Error(`解析在第 ${rowNumber} 行中断：物料 [${comboText}] 的单位用量无效！`)
    }

    const unitPrice = parseFloat(unitPriceStr)
    if (unitPriceStr && isNaN(unitPrice)) {
      throw new Error(`解析在第 ${rowNumber} 行中断：物料 [${comboText}] 的单价无效！`)
    }

    const wastageCell = row.getCell(7)
    const wastageRawStr = safelyGetCellValue(wastageCell) || '0'
    let wastage = parseFloat(wastageRawStr)

    // 智能百分比归一化
    if (wastageCell.type === ExcelJS.ValueType.Number && wastageCell.numFmt?.includes('%')) {
      const numericValue = wastageCell.value as number
      wastage = numericValue * 100
    } else if (wastageRawStr.endsWith('%')) {
      wastage = parseFloat(wastageRawStr.replace('%', ''))
    }

    if (isNaN(wastage)) {
      throw new Error(`解析在第 ${rowNumber} 行中断：物料 [${comboText}] 的损耗比例无效！`)
    }

    items.push({
      id: crypto.randomUUID(),
      section,
      materialId,
      unitPrice: isNaN(unitPrice) ? 0 : unitPrice,
      unitUsage,
      wastagePercent: isNaN(wastage) ? 0 : wastage,
      standardUsage: Number((unitUsage * (1 + wastage / 100)).toFixed(6)),
    })
  })

  if (mainRowExceeded) {
    throw new Error(`配方明细行数超过 ${BOM_EXCEL_LIMITS.maxRows} 行上限，请拆分后分次录入。`)
  }

  return {
    items,
    productId: resolvedProductId,
    materials: extractedMaterials,
  }
}
