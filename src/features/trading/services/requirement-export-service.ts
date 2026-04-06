import { AppLocale, translate } from '@/locales'
import { loadExcelJS } from '@/lib/lazy-vendors'
import { type MaterialRequirement } from '@/features/mrp/data/schema'
import type { Alignment, Borders } from 'exceljs'

export const RequirementExportService = {
    async exportToExcel(data: MaterialRequirement[], locale: AppLocale) {
        const { default: ExcelJS } = await loadExcelJS()
        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet(translate(locale, 'trading.requirements.export.sheetName'))

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

        const thinBorder: Partial<Borders> = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        }

        const centerAlignment: Partial<Alignment> = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
        }

        sheet.mergeCells('A1:A3')
        const logoCell = sheet.getCell('A1')
        logoCell.value = translate(locale, 'trading.requirements.export.logo')
        logoCell.font = { bold: true, size: 14 }
        logoCell.alignment = centerAlignment
        logoCell.border = thinBorder

        sheet.mergeCells('B1:E3')
        const titleCell = sheet.getCell('B1')
        titleCell.value = translate(locale, 'trading.requirements.export.title')
        titleCell.font = { bold: true, size: 18 }
        titleCell.alignment = centerAlignment
        titleCell.border = thinBorder

        const today = new Date().toLocaleDateString(locale === 'zh-CN' ? 'zh-CN' : 'en-CA').replace(/\//g, '-')

        sheet.getCell('I1').value = translate(locale, 'trading.requirements.export.docCode')
        sheet.getCell('I2').value = translate(locale, 'trading.requirements.export.version')
        sheet.getCell('I3').value = translate(locale, 'trading.requirements.export.effectiveDate')
        sheet.getCell('J2').value = 'A1'
        sheet.getCell('J3').value = today

        ;['I1', 'J1', 'I2', 'J2', 'I3', 'J3'].forEach((ref) => {
            const cell = sheet.getCell(ref)
            cell.border = thinBorder
            cell.alignment = centerAlignment
            cell.font = { size: 9 }
        })

        const separator = translate(locale, 'trading.requirements.export.separator')
        const uniqueProducts = Array.from(new Set(data.flatMap((item) => item.sourceOrders.map((order) => order.productName))))
        const productList = uniqueProducts.length > 3
            ? `${uniqueProducts.slice(0, 3).join(separator)} ${translate(locale, 'trading.requirements.export.productsMore', { count: uniqueProducts.length - 3 })}`
            : uniqueProducts.join(separator)

        sheet.mergeCells('A4:J4')
        const descCell = sheet.getCell('A4')
        descCell.value = translate(locale, 'trading.requirements.export.description', {
            products: productList,
            count: data.length
        })
        descCell.font = { bold: true, size: 10 }
        descCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
        descCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        descCell.border = thinBorder
        sheet.getRow(4).height = 25

        const headerRow = sheet.getRow(5)
        headerRow.height = 25
        headerRow.values = [
            translate(locale, 'trading.requirements.export.headers.section'),
            translate(locale, 'trading.requirements.export.headers.code'),
            translate(locale, 'trading.requirements.export.headers.name'),
            translate(locale, 'trading.requirements.export.headers.spec'),
            translate(locale, 'trading.requirements.export.headers.unit'),
            translate(locale, 'trading.requirements.export.headers.total'),
            translate(locale, 'trading.requirements.export.headers.inventory'),
            translate(locale, 'trading.requirements.export.headers.gap'),
            translate(locale, 'trading.requirements.export.headers.packaging'),
            translate(locale, 'trading.requirements.export.headers.remark')
        ]
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FF000000' } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } }
            cell.border = thinBorder
            cell.alignment = centerAlignment
        })

        let currentRowNum = 6
        const sections = Array.from(new Set(data.map((item) => item.section)))

        sections.forEach((sectionName, sectionIndex) => {
            sheet.mergeCells(`A${currentRowNum}:J${currentRowNum}`)
            const sectionHeader = sheet.getCell(`A${currentRowNum}`)
            sectionHeader.value = translate(locale, 'trading.requirements.export.sectionTitle', {
                section: sectionName,
                date: today
            })
            sectionHeader.font = { bold: true, size: 11 }
            sectionHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }
            sectionHeader.border = thinBorder
            sheet.getRow(currentRowNum).height = 24
            currentRowNum++

            const sectionItems = data.filter((item) => item.section === sectionName)
            sectionItems.forEach((item) => {
                const row = sheet.getRow(currentRowNum)
                row.height = 24

                let packagingDesc = '-'
                if (item.packaging) {
                    const { packQty, packUnit, factor, direction } = item.packaging
                    const formula = direction === 'reverse'
                        ? translate(locale, 'trading.requirements.export.packagingFormulaReverse', { unit: item.unit, factor, packUnit })
                        : translate(locale, 'trading.requirements.export.packagingFormulaForward', { unit: item.unit, factor, packUnit })
                    packagingDesc = `${packQty} ${packUnit} (${formula})`
                }

                const shortageStr = item.shortageGap > 0
                    ? item.packaging
                        ? translate(locale, 'trading.requirements.export.shortageWithPack', {
                            gap: item.shortageGap.toFixed(1),
                            unit: item.unit,
                            packQty: item.packaging.packQty,
                            packUnit: item.packaging.packUnit
                        })
                        : `${item.shortageGap.toFixed(1)} ${item.unit}`
                    : translate(locale, 'trading.requirements.export.shortageEnough')

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
                    item.sourceOrders.map((order) => `[${order.customerName}] ${order.productName}(${order.qty})`).join('; ')
                ]

                row.eachCell((cell, colNumber) => {
                    cell.border = thinBorder
                    cell.alignment = colNumber === 10 ? { ...centerAlignment, horizontal: 'left' } : centerAlignment
                    cell.font = { size: 10 }

                    if (colNumber === 6) {
                        cell.font = { bold: true, color: { argb: 'FF000000' } }
                    }
                    if (colNumber === 7) {
                        cell.font = { color: { argb: 'FF2563EB' } }
                    }
                    if (colNumber === 8 && item.shortageGap > 0) {
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
                    sheet.getRow(currentRowNum).getCell(col).border = thinBorder
                }
                currentRowNum++
            }
        })

        const startFooterRow = currentRowNum + 1

        sheet.mergeCells(`A${startFooterRow}:B${startFooterRow}`)
        const deptCell = sheet.getCell(`A${startFooterRow}`)
        deptCell.value = translate(locale, 'trading.requirements.export.issueDept')
        deptCell.border = thinBorder
        deptCell.alignment = centerAlignment
        deptCell.font = { size: 9 }

        sheet.mergeCells(`C${startFooterRow}:J${startFooterRow}`)
        const infoCell = sheet.getCell(`C${startFooterRow}`)
        infoCell.value = translate(locale, 'trading.requirements.export.recipientInfo')
        infoCell.border = thinBorder
        infoCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        infoCell.font = { size: 9, italic: true }

        const signRowNum = startFooterRow + 1
        const signRow = sheet.getRow(signRowNum)
        signRow.height = 30
        signRow.values = [
            translate(locale, 'trading.requirements.export.proofread'),
            '',
            translate(locale, 'trading.requirements.export.review'),
            '',
            translate(locale, 'trading.requirements.export.preparedBy'),
            '',
            '',
            '',
            '',
            translate(locale, 'trading.requirements.export.preparedDate', { date: today })
        ]
        signRow.eachCell((cell, colNumber) => {
            cell.border = thinBorder
            cell.alignment = centerAlignment
            cell.font = { size: 10, bold: [1, 3, 5].includes(colNumber) }
        })

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = window.URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = translate(locale, 'trading.requirements.export.fileName', {
            date: new Date().toISOString().split('T')[0]
        })
        anchor.click()
        window.URL.revokeObjectURL(url)
    }
}
