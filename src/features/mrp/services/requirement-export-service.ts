import { type AppLocale, translate } from '@/locales'
import {
  applyWorksheetHeaderRowStyle,
  createExcelWorkbook,
  downloadWorkbook,
  EXCEL_CENTER_ALIGNMENT,
  EXCEL_THIN_BORDER,
} from '@/lib/excel/export'
import { type MaterialRequirement } from '../data/requirement-schema'
import { RequirementCoreService } from './requirement-core-service'

export const RequirementExportService = {
  async exportToExcel(data: MaterialRequirement[], locale: AppLocale) {
    const workbook = await createExcelWorkbook()
    const sheet = workbook.addWorksheet(
      translate(locale, 'mrp.requirements.export.sheetName')
    )

    sheet.columns = [
      { width: 12, key: 'section' },
      { width: 22, key: 'code' },
      { width: 28, key: 'name' },
      { width: 35, key: 'spec' },
      { width: 8, key: 'unit' },
      { width: 12, key: 'total' },
      { width: 12, key: 'inventory' },
      { width: 12, key: 'gap' },
      { width: 20, key: 'packaging' },
      { width: 45, key: 'remark' },
    ]

    sheet.mergeCells('A1:A3')
    const logoCell = sheet.getCell('A1')
    logoCell.value = translate(locale, 'mrp.requirements.export.logo')
    logoCell.font = { bold: true, size: 14 }
    logoCell.alignment = EXCEL_CENTER_ALIGNMENT
    logoCell.border = EXCEL_THIN_BORDER

    sheet.mergeCells('B1:E3')
    const titleCell = sheet.getCell('B1')
    titleCell.value = translate(locale, 'mrp.requirements.export.title')
    titleCell.font = { bold: true, size: 18 }
    titleCell.alignment = EXCEL_CENTER_ALIGNMENT
    titleCell.border = EXCEL_THIN_BORDER

    const today = new Date()
      .toLocaleDateString(locale === 'zh-CN' ? 'zh-CN' : 'en-CA')
      .replace(/\//g, '-')

    sheet.getCell('I1').value = translate(
      locale,
      'mrp.requirements.export.docCode'
    )
    sheet.getCell('I2').value = translate(
      locale,
      'mrp.requirements.export.version'
    )
    sheet.getCell('I3').value = translate(
      locale,
      'mrp.requirements.export.effectiveDate'
    )
    sheet.getCell('J2').value = 'A1'
    sheet.getCell('J3').value = today
    ;['I1', 'J1', 'I2', 'J2', 'I3', 'J3'].forEach((ref) => {
      const cell = sheet.getCell(ref)
      cell.border = EXCEL_THIN_BORDER
      cell.alignment = EXCEL_CENTER_ALIGNMENT
      cell.font = { size: 9 }
    })

    const productList = RequirementCoreService.getUniqueProductsSummary(
      data,
      locale
    )

    sheet.mergeCells('A4:J4')
    const descCell = sheet.getCell('A4')
    descCell.value = translate(locale, 'mrp.requirements.export.description', {
      products: productList,
      count: data.length,
    })
    descCell.font = { bold: true, size: 10 }
    descCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' },
    }
    descCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    descCell.border = EXCEL_THIN_BORDER
    sheet.getRow(4).height = 25

    const headerRow = sheet.getRow(5)
    headerRow.height = 25
    headerRow.values = [
      translate(locale, 'mrp.requirements.export.headers.section'),
      translate(locale, 'mrp.requirements.export.headers.code'),
      translate(locale, 'mrp.requirements.export.headers.name'),
      translate(locale, 'mrp.requirements.export.headers.spec'),
      translate(locale, 'mrp.requirements.export.headers.unit'),
      translate(locale, 'mrp.requirements.export.headers.total'),
      translate(locale, 'mrp.requirements.export.headers.inventory'),
      translate(locale, 'mrp.requirements.export.headers.gap'),
      translate(locale, 'mrp.requirements.export.headers.packaging'),
      translate(locale, 'mrp.requirements.export.headers.remark'),
    ]
    applyWorksheetHeaderRowStyle(headerRow, {
      fillColorArgb: 'FFEFEFEF',
      fontColorArgb: 'FF000000',
    })

    let currentRowNum = 6
    const sections = Array.from(new Set(data.map((item) => item.section)))

    sections.forEach((sectionName, sectionIndex) => {
      sheet.mergeCells(`A${currentRowNum}:J${currentRowNum}`)
      const sectionHeader = sheet.getCell(`A${currentRowNum}`)
      sectionHeader.value = translate(
        locale,
        'mrp.requirements.export.sectionTitle',
        {
          section: sectionName,
          date: today,
        }
      )
      sectionHeader.font = { bold: true, size: 11 }
      sectionHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' },
      }
      sectionHeader.border = EXCEL_THIN_BORDER
      sheet.getRow(currentRowNum).height = 24
      currentRowNum++

      const sectionItems = data.filter((item) => item.section === sectionName)
      sectionItems.forEach((item) => {
        const row = sheet.getRow(currentRowNum)
        row.height = 24

        const packagingDesc = RequirementCoreService.formatPackaging(
          item,
          locale
        )
        const shortageStr = RequirementCoreService.formatShortage(item, locale)

        row.values = [
          item.section,
          item.materialCode,
          item.materialName,
          item.materialSpec,
          item.unit,
          `${item.totalRequired.toFixed(1)} ${item.unit}`,
          `${item.inventoryQty.toFixed(1)} ${item.unit}`,
          shortageStr,
          packagingDesc,
          item.sourceOrders
            .map(
              (order) =>
                `[${order.customerName}] ${order.productName}(${order.qty})`
            )
            .join('; '),
        ]

        row.eachCell((cell, colNumber) => {
          cell.border = EXCEL_THIN_BORDER
          cell.alignment =
            colNumber === 10
              ? { ...EXCEL_CENTER_ALIGNMENT, horizontal: 'left' }
              : EXCEL_CENTER_ALIGNMENT
          cell.font = { size: 10 }

          if (colNumber === 6) {
            cell.font = { bold: true, color: { argb: 'FF000000' } }
          }
          if (colNumber === 7) {
            cell.font = { color: { argb: 'FF2563EB' } }
          }
          if (colNumber === 8 && item.effectiveGap > 0) {
            cell.font = { bold: true, color: { argb: 'FFE11D48' } }
          }
          if (colNumber === 9 && item.packaging) {
            cell.font = { italic: true, color: { argb: 'FF16A34A' } }
          }
        })
        currentRowNum++
      })

      if (sectionIndex < sections.length - 1) {
        sheet.getRow(currentRowNum).height = 12
        for (let col = 1; col <= 10; col++) {
          sheet.getRow(currentRowNum).getCell(col).border = EXCEL_THIN_BORDER
        }
        currentRowNum++
      }
    })

    const startFooterRow = currentRowNum + 1

    sheet.mergeCells(`A${startFooterRow}:B${startFooterRow}`)
    const deptCell = sheet.getCell(`A${startFooterRow}`)
    deptCell.value = translate(locale, 'mrp.requirements.export.issueDept')
    deptCell.border = EXCEL_THIN_BORDER
    deptCell.alignment = EXCEL_CENTER_ALIGNMENT
    deptCell.font = { size: 9 }

    sheet.mergeCells(`C${startFooterRow}:J${startFooterRow}`)
    const infoCell = sheet.getCell(`C${startFooterRow}`)
    infoCell.value = translate(locale, 'mrp.requirements.export.recipientInfo')
    infoCell.border = EXCEL_THIN_BORDER
    infoCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    infoCell.font = { size: 9, italic: true }

    const signRowNum = startFooterRow + 1
    const signRow = sheet.getRow(signRowNum)
    signRow.height = 30
    signRow.values = [
      translate(locale, 'mrp.requirements.export.proofread'),
      '',
      translate(locale, 'mrp.requirements.export.review'),
      '',
      translate(locale, 'mrp.requirements.export.preparedBy'),
      '',
      '',
      '',
      '',
      translate(locale, 'mrp.requirements.export.preparedDate', {
        date: today,
      }),
    ]
    signRow.eachCell((cell, colNumber) => {
      cell.border = EXCEL_THIN_BORDER
      cell.alignment = EXCEL_CENTER_ALIGNMENT
      cell.font = { size: 10, bold: [1, 3, 5].includes(colNumber) }
    })

    await downloadWorkbook(
      workbook,
      translate(locale, 'mrp.requirements.export.fileName', {
        date: new Date().toISOString().split('T')[0],
      })
    )
  },
}
