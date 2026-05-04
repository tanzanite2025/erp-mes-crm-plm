import { loadExcelJS } from '@/lib/lazy-vendors'
import type { Borders, DataValidation, Workbook } from 'exceljs'
import { type MaterialOption } from '../../material-archive/data/schema'
import { type Product } from '../data/schema'
import { formatEngineeringExportFileDate } from '../utils/engineering-export-file-date'
import { formatProductDisplayName } from '../utils/product-utils'
import { BOM_EXCEL_LIMITS, BOM_EXCEL_LOCK_PASSWORDS, BOM_EXCEL_SHEETS } from './bom-excel-contract'
import { escapeFormula } from './bom-excel-security'

const downloadWorkbook = async (workbook: Workbook, fileName: string) => {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.download = fileName
  a.click()
  window.URL.revokeObjectURL(url)
}

/**
 * 导出带高级联动特性的智能填报模板
 * 预埋隐藏档案库以支撑下拉与 VLOOKUP (包含物料和产品双重字典)
 */
export const generateBOMTemplate = async (
  materials: MaterialOption[],
  products: Product[],
) => {
  const { default: ExcelJS } = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()

  // --- 1. 创建物料与产品档案参考页 (绝对隐藏) ---
  const archiveSheet = workbook.addWorksheet(BOM_EXCEL_SHEETS.archive, { state: 'veryHidden' })
  archiveSheet.columns = [
    // 物料区 (A-F)
    { header: 'Material_ComboText', key: 'm_combo' },
    { header: 'Material_ID', key: 'm_id' },
    { header: 'Name', key: 'm_name' },
    { header: 'Spec', key: 'm_spec' },
    { header: 'Unit', key: 'm_unit' },
    { header: 'Price', key: 'm_price' },
    { header: 'Category', key: 'm_category' },
    // 分割区
    { header: '', key: 'gap' },
    // 产品区 (H-I)
    { header: 'Product_ComboText', key: 'p_combo' },
    { header: 'Product_ID', key: 'p_id' },
  ]

  const maxRows = Math.max(materials.length, products.length)
  for (let i = 0; i < maxRows; i++) {
    const m = materials[i]
    const p = products[i]
    const rowData: Record<string, unknown> = {}
    if (m) {
      rowData.m_combo = escapeFormula(`[${m.code}] ${m.name} - ${m.spec || '规格未录'}`)
      rowData.m_id = m.id
      rowData.m_name = escapeFormula(m.name)
      rowData.m_spec = escapeFormula(m.spec)
      rowData.m_unit = m.uom
      rowData.m_price = m.costPrice || 0
      rowData.m_category = m.category
    }
    if (p) {
      rowData.p_combo = escapeFormula(`[${p.sku}] ${formatProductDisplayName(p)}`)
      rowData.p_id = p.id
    }

    archiveSheet.addRow(rowData)
  }

  // --- 2. 创建用户填报主表 ---
  const sheet = workbook.addWorksheet(BOM_EXCEL_SHEETS.main, {
    views: [{ state: 'frozen', ySplit: 1, xSplit: 0 }],
  })

  sheet.columns = [
    { header: '适用产品型号 (必填下拉锁定)', key: 'product', width: 45 },
    { header: '工段 (必填下拉)', key: 'section', width: 25 },
    { header: '选择物料 (必填下拉)', key: 'material', width: 45 },
    { header: '单位 (智能匹配只读)', key: 'unit', width: 20 },
    { header: '标准单价 (可修改)', key: 'price', width: 22 },
    { header: '单位用量 (必填)*', key: 'usage', width: 18 },
    { header: '损耗比例 (必填)', key: 'wastage', width: 18 },
    { header: '操作备注', key: 'remark', width: 30 },
  ]

  // 增强表头视觉等级
  const headerRow = sheet.getRow(1)
  headerRow.height = 25
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

  // --- 2.1 增加强硬的数字类型输入防爆破拦截 (Data Validation) ---
  const validateDecimalLabel: DataValidation = {
    type: 'decimal',
    operator: 'greaterThanOrEqual',
    formulae: [0],
    showErrorMessage: true,
    errorTitle: '非法输入拦截',
    error: '必须输入纯数字。请检查是否误触键盘敲入了字母。',
  }

  const validateDecimalPositiveLabel: DataValidation = {
    ...validateDecimalLabel,
    operator: 'greaterThan',
    error: '单位用量不仅需要是纯数字，且必须大于0。',
  }

  // --- 3. 预渲染交互槽位 ---
  const maxArchiveRow = Math.max(materials.length, products.length) + 1
  const defaultBorder = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  } satisfies Pick<Borders, 'top' | 'left' | 'bottom' | 'right'>

  for (let i = 2; i <= BOM_EXCEL_LIMITS.templateRows; i++) {
    const row = sheet.getRow(i)
    row.height = 22

    // 统一应用浅色细边框，防止被 fill 属性（底色）吃掉默认网格线
    ;['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((col) => {
      row.getCell(col).border = defaultBorder
    })

    // 【数据验证】A列：产品选择
    row.getCell('A').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`${BOM_EXCEL_SHEETS.archive}!$H$2:$H$${maxArchiveRow}`],
    }

    // 【数据验证】B列：工段枚举
    row.getCell('B').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"备料,卷料,成型,机加,精细,涂装,包装"'],
    }

    // 【数据验证】C列：动态指向档案页 A 列的物料下拉
    row.getCell('C').dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`'${BOM_EXCEL_SHEETS.archive}'!$A$2:$A$${maxArchiveRow}`],
    }

    // 【数据验证】E/F/G列：强数字拦截
    row.getCell('E').dataValidation = validateDecimalLabel
    row.getCell('F').dataValidation = validateDecimalPositiveLabel
    row.getCell('G').dataValidation = validateDecimalLabel

    // 【智能填充】D/E列：侦听 C 列变动，经 Sheet VLOOKUP 获取单位和单价
    row.getCell('D').value = { formula: `IFERROR(VLOOKUP(C${i}, '${BOM_EXCEL_SHEETS.archive}'!A:F, 5, FALSE)&"", "")` }
    row.getCell('E').value = { formula: `IF(C${i}="", "", IFERROR(VLOOKUP(C${i}, '${BOM_EXCEL_SHEETS.archive}'!A:F, 6, FALSE), 0))` }

    // 权限切分：开放操作列的写全权限，开放单价(E)让用户能在公式基础上改写
    ;['A', 'B', 'C', 'E', 'F', 'G', 'H'].forEach((col) => {
      row.getCell(col).protection = { locked: false }
    })

    // 权限收紧：将产生公式连动的绝对不可改写列死锁
    ;['D'].forEach((col) => {
      const cell = row.getCell(col)
      cell.protection = { locked: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
    })

    // F列(用量)和 G列(损耗)由于必填，给一个醒目底色
    row.getCell('F').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF2F8' } }
    row.getCell('G').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDF2F8' } }
  }

  // --- 4. 施加保护 ---
  await sheet.protect(BOM_EXCEL_LOCK_PASSWORDS.mainSheet, {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: true,
    insertRows: false,
    deleteRows: true,
  })

  await archiveSheet.protect(BOM_EXCEL_LOCK_PASSWORDS.archiveSheet, {
    selectLockedCells: false,
    selectUnlockedCells: false,
    formatCells: false,
    insertRows: false,
    deleteRows: false,
    insertColumns: false,
    deleteColumns: false,
  })

  // --- 5. 导出 ---
  const timestamp = formatEngineeringExportFileDate()
  await downloadWorkbook(workbook, `XDFC_BOM自由录入模板_${timestamp}.xlsx`)
}
