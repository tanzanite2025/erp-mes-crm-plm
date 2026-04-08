import { type AppLocale, translate } from '@/locales'
import { loadExcelJS } from '@/lib/lazy-vendors'
import type { Cell, CellValue, Row, Workbook } from 'exceljs'
import { type Material } from '../data/schema'
import { packagingService } from './packaging-service'
import { unitService } from '../../basic-settings/services/unit-service'
import { DictionaryCoreService } from '../../basic-settings/services/dictionary-core-service'
import { MaterialCoreService } from './material-core-service'

const DICT_SHEET_NAME = '__MATERIAL_DICTIONARY__'
const CONFIG_SHEET_NAME = '__SYSTEM_CONFIG__'
const LEGACY_DICT_SHEET_NAME = '数据字典'
const LEGACY_MAINTENANCE_SHEET_NAME = '物料档案维护'

function getMaintenanceSheetNames() {
  return Array.from(
    new Set([
      LEGACY_MAINTENANCE_SHEET_NAME,
      translate('zh-CN', 'materialArchive.excel.maintenanceSheetName'),
      translate('en-US', 'materialArchive.excel.maintenanceSheetName'),
    ])
  )
}

function getDictionarySheetNames() {
  return Array.from(new Set([DICT_SHEET_NAME, LEGACY_DICT_SHEET_NAME]))
}

function escapeFormula(value: unknown) {
  if (typeof value !== 'string') return value
  if (value.length > 0 && ['=', '+', '-', '@'].includes(value[0])) {
    return `'${value}`
  }
  return value
}

function unescapeFormula(value: string) {
  if (!value) return value
  if (value.length > 1 && value[0] === '\'' && ['=', '+', '-', '@'].includes(value[1])) {
    return value.slice(1)
  }
  return value
}

function getWorksheetByNames(workbook: Workbook, names: string[]) {
  for (const name of names) {
    const sheet = workbook.getWorksheet(name)
    if (sheet) return sheet
  }
  return undefined
}

function getCellValue(cell: Cell) {
	const value = cell.value as CellValue | undefined
	if (value === null || value === undefined) return ''
	if (typeof value === 'object' && 'result' in value) {
		const resultValue = value.result
		return unescapeFormula(resultValue?.toString() || '')
	}
	return unescapeFormula(value.toString().trim())
}

export const MaterialExcelService = {
  async exportMaterials(
    materials: Material[],
    categoryLabel: string = translate('zh-CN', 'materialArchive.excel.allMaterials'),
    locale: AppLocale = 'zh-CN'
  ) {
    const { default: ExcelJS } = await loadExcelJS()
    const workbook = new ExcelJS.Workbook()

    const { version } = await MaterialCoreService.getMaterialsWithVersion()
    const globalVersion = Number(version)

    const dictSheet = workbook.addWorksheet(DICT_SHEET_NAME, { state: 'veryHidden' })
    const configSheet = workbook.addWorksheet(CONFIG_SHEET_NAME, { state: 'veryHidden' })

    const units = await unitService.getUnits()
    const categories = DictionaryCoreService.getOptions('MATERIAL_CATEGORY')

    dictSheet.columns = [
      { header: 'Unit_Name', key: 'u_name' },
      { header: 'Unit_Code', key: 'u_code' },
      { header: 'Category_Name', key: 'c_name' },
      { header: 'Category_Value', key: 'c_val' },
    ]

    configSheet.columns = [
      { header: 'Config_Key', key: 'key' },
      { header: 'Config_Value', key: 'value' },
    ]
    configSheet.addRow({ key: 'GLOBAL_MATERIAL_VERSION', value: globalVersion })

    const maxDictRows = Math.max(units.length, categories.length)
    for (let i = 0; i < maxDictRows; i += 1) {
      dictSheet.addRow({
        u_name: units[i]?.name || '',
        u_code: units[i]?.code || '',
        c_name: categories[i]?.label || '',
        c_val: categories[i]?.value || '',
      })
    }

    const sheet = workbook.addWorksheet(
      translate(locale, 'materialArchive.excel.maintenanceSheetName'),
      { views: [{ state: 'frozen', ySplit: 1, xSplit: 0 }] }
    )

    sheet.columns = [
      { header: translate(locale, 'materialArchive.excel.headers.id'), key: 'id', width: 10 },
      { header: translate(locale, 'materialArchive.excel.headers.code'), key: 'code', width: 22 },
      { header: translate(locale, 'materialArchive.excel.headers.name'), key: 'name', width: 35 },
      { header: translate(locale, 'materialArchive.excel.headers.spec'), key: 'spec', width: 45 },
      { header: translate(locale, 'materialArchive.excel.headers.category'), key: 'categoryLabel', width: 22 },
      { header: translate(locale, 'materialArchive.excel.headers.uom'), key: 'uom', width: 18 },
      { header: translate(locale, 'materialArchive.excel.headers.packUnit'), key: 'packUnit', width: 18 },
      { header: translate(locale, 'materialArchive.excel.headers.factor'), key: 'factor', width: 15 },
      { header: translate(locale, 'materialArchive.excel.headers.example'), key: 'example', width: 25 },
      { header: translate(locale, 'materialArchive.excel.headers.description'), key: 'description', width: 40 },
    ]

    const activeRules = await packagingService.getRules()
    const headerRow = sheet.getRow(1)
    headerRow.height = 35
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

    materials.forEach((material, idx) => {
      const currentRule = activeRules.find((rule) => rule.materialId === material.id)
      const categoryText =
        categories.find(
          (option) => option.value.toUpperCase() === (material.category || '').toUpperCase()
        )?.label || material.category
      const compositeId = `${material.id}_${material.version || 1}`

      const row = sheet.addRow({
        id: compositeId,
        code: escapeFormula(material.code),
        name: escapeFormula(material.name),
        spec: escapeFormula(material.spec || ''),
        categoryLabel: categoryText,
        uom: material.uom,
        packUnit: currentRule?.packUnit || '',
        factor: currentRule?.conversionFactor || '',
        example: '',
        description: escapeFormula(material.description || ''),
      })

      ;['A', 'B', 'C', 'D'].forEach((col) => {
        row.getCell(col).protection = { locked: true }
        row.getCell(col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' },
        }
      })

      ;['E', 'F', 'G', 'H', 'J'].forEach((col) => {
        row.getCell(col).protection = { locked: false }
      })

      const exampleCell = row.getCell('I')
      exampleCell.protection = { locked: true }
      exampleCell.font = { italic: true, color: { argb: 'FF64748B' } }
      exampleCell.value = {
        formula: `IF(OR(G${idx + 2}="", H${idx + 2}=""), "", "1 " & G${idx + 2} & " = " & H${idx + 2} & " " & F${idx + 2})`,
      }

      row.getCell('E').dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'${DICT_SHEET_NAME}'!$C$2:$C$${categories.length + 1}`],
      }

      row.getCell('F').dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'${DICT_SHEET_NAME}'!$A$2:$A$${units.length + 1}`],
      }

      row.getCell('H').dataValidation = {
        type: 'decimal',
        operator: 'greaterThan',
        formulae: [0],
        showErrorMessage: true,
        errorTitle: translate(locale, 'materialArchive.excel.validation.factorErrorTitle'),
        error: translate(locale, 'materialArchive.excel.validation.factorError'),
      }
    })

    sheet.getColumn('A').hidden = true

    await sheet.protect('xdfc_safe_edit_2026', {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: true,
      insertRows: false,
      deleteRows: false,
      formatColumns: false,
    })

    const coreLockOptions = {
      selectLockedCells: false,
      selectUnlockedCells: false,
      formatCells: false,
      insertRows: false,
      deleteRows: false,
    }

    await dictSheet.protect('xdfc_safe_edit_2026_core', coreLockOptions)
    await configSheet.protect('xdfc_safe_edit_2026_core', coreLockOptions)

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const date = new Date().toISOString().split('T')[0]

    anchor.href = url
    anchor.download = translate(locale, 'materialArchive.excel.fileName', {
      category: categoryLabel,
      date,
    })
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
  },

  async parseMaterialExcel(file: File, locale: AppLocale = 'zh-CN') {
    const { default: ExcelJS } = await loadExcelJS()
    const workbook = new ExcelJS.Workbook()
    const arrayBuffer = await file.arrayBuffer()
    await workbook.xlsx.load(arrayBuffer)

    const configSheet = workbook.getWorksheet(CONFIG_SHEET_NAME)
    let globalSnapshotVersion = 0
    if (configSheet) {
      configSheet.eachRow((row: Row) => {
        const key = row.getCell(1).value?.toString()
        if (key === 'GLOBAL_MATERIAL_VERSION') {
          globalSnapshotVersion = Number(row.getCell(2).value)
        }
      })
    }

    const dictSheet = getWorksheetByNames(workbook, getDictionarySheetNames())
    const categoryMap = new Map<string, string>()
    if (dictSheet) {
      dictSheet.eachRow((row: Row, index: number) => {
        if (index === 1) return
        const categoryName = row.getCell(3).value?.toString().trim()
        const categoryValue = row.getCell(4).value?.toString().trim()
        if (categoryName && categoryValue) {
          categoryMap.set(categoryName, categoryValue)
        }
      })
    }

    const maintenanceSheet = getWorksheetByNames(workbook, getMaintenanceSheetNames()) || workbook.getWorksheet(1)
    if (!maintenanceSheet) {
      throw new Error(
        translate(locale, 'materialArchive.excel.parse.sheetNotFound', {
          sheetName: translate(locale, 'materialArchive.excel.maintenanceSheetName'),
        })
      )
    }

    const materials: Partial<Material>[] = []

    maintenanceSheet.eachRow((row: Row, index: number) => {
      if (index === 1) return

      const compositeId = getCellValue(row.getCell(1))
      if (!compositeId) return

      const lastUnderscore = compositeId.lastIndexOf('_')
      const id = lastUnderscore !== -1 ? compositeId.substring(0, lastUnderscore) : compositeId
      const version =
        lastUnderscore !== -1 ? Number(compositeId.substring(lastUnderscore + 1)) : undefined

      const categoryLabel = getCellValue(row.getCell(5))
      const categoryValue = categoryMap.get(categoryLabel) || categoryLabel

      materials.push({
        id,
        version,
        code: getCellValue(row.getCell(2)),
        name: getCellValue(row.getCell(3)),
        spec: getCellValue(row.getCell(4)),
        category: categoryValue,
        uom: getCellValue(row.getCell(6)),
        description: getCellValue(row.getCell(10)),
      })
    })

    return { materials, globalSnapshotVersion }
  },
}
