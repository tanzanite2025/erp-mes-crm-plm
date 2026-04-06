import { AppLocale, translate } from '@/locales'
import { loadExcelJS } from '@/lib/lazy-vendors'

export const UnitExcelTemplate = {
    async downloadTemplate(locale: AppLocale) {
        const { default: ExcelJS } = await loadExcelJS()
        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet(translate(locale, 'basicSettings.units.excel.sheetName'), {
            views: [{ state: 'frozen', ySplit: 1 }]
        })

        sheet.columns = [
            { header: translate(locale, 'basicSettings.units.excel.headers.code'), key: 'code', width: 25 },
            { header: translate(locale, 'basicSettings.units.excel.headers.name'), key: 'name', width: 25 },
            { header: translate(locale, 'basicSettings.units.excel.headers.category'), key: 'category', width: 15 },
            { header: translate(locale, 'basicSettings.units.excel.headers.precision'), key: 'precision', width: 15 },
            { header: translate(locale, 'basicSettings.units.excel.headers.description'), key: 'description', width: 40 }
        ]

        const headerRow = sheet.getRow(1)
        headerRow.height = 30
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E40AF' }
        }
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

        const categories = [
            translate(locale, 'basicSettings.units.excel.categoryQuantity'),
            translate(locale, 'basicSettings.units.excel.categoryWeight'),
            translate(locale, 'basicSettings.units.excel.categoryLength'),
            translate(locale, 'basicSettings.units.excel.categoryArea'),
            translate(locale, 'basicSettings.units.excel.categoryVolume'),
            translate(locale, 'basicSettings.units.excel.categoryTime'),
            translate(locale, 'basicSettings.units.excel.categoryOther'),
        ]

        for (let i = 2; i <= 100; i++) {
            const row = sheet.getRow(i)

            row.getCell('C').dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${categories.join(',')}"`],
                showErrorMessage: true,
                errorTitle: translate(locale, 'basicSettings.units.excel.validation.categoryErrorTitle'),
                error: translate(locale, 'basicSettings.units.excel.validation.categoryError')
            }

            row.getCell('D').dataValidation = {
                type: 'whole',
                operator: 'between',
                allowBlank: true,
                formulae: [0, 10],
                showErrorMessage: true,
                errorTitle: translate(locale, 'basicSettings.units.excel.validation.precisionErrorTitle'),
                error: translate(locale, 'basicSettings.units.excel.validation.precisionError')
            }
        }

        sheet.addRow({
            code: translate(locale, 'basicSettings.units.excel.sample.code1'),
            name: translate(locale, 'basicSettings.units.excel.sample.name1'),
            category: translate(locale, 'basicSettings.units.excel.sample.category1'),
            precision: Number(translate(locale, 'basicSettings.units.excel.sample.precision1')),
            description: translate(locale, 'basicSettings.units.excel.sample.description1')
        })
        sheet.addRow({
            code: translate(locale, 'basicSettings.units.excel.sample.code2'),
            name: translate(locale, 'basicSettings.units.excel.sample.name2'),
            category: translate(locale, 'basicSettings.units.excel.sample.category2'),
            precision: Number(translate(locale, 'basicSettings.units.excel.sample.precision2')),
            description: translate(locale, 'basicSettings.units.excel.sample.description2')
        })

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = window.URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        const date = new Date().toISOString().split('T')[0]

        anchor.href = url
        anchor.download = translate(locale, 'basicSettings.units.excel.fileName', { date })
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
        window.URL.revokeObjectURL(url)
    }
}
