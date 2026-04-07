import { AppLocale, translate } from '@/locales'
import { loadExcelJS } from '@/lib/lazy-vendors'

import { MasterDataSearchResult } from './inventory-core-service'
import { InboundRecord, ShipmentRecord } from './inventory-transaction-service'

export const WarehouseExportService = {
    async exportInbound(
        data: InboundRecord[],
        masterDataMap: Record<string, MasterDataSearchResult>,
        locale: AppLocale
    ) {
        const { default: ExcelJS } = await loadExcelJS()
        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet(translate(locale, 'warehouse.export.inboundSheetName'))

        sheet.columns = [
            { width: 15, key: 'date' },
            { width: 20, key: 'code' },
            { width: 25, key: 'name' },
            { width: 15, key: 'batch' },
            { width: 12, key: 'qty' },
            { width: 10, key: 'uom' },
            { width: 15, key: 'category' },
            { width: 12, key: 'operator' },
            { width: 30, key: 'remarks' },
        ]

        const headerRow = sheet.addRow([
            translate(locale, 'warehouse.export.inboundHeaders.date'),
            translate(locale, 'warehouse.export.inboundHeaders.code'),
            translate(locale, 'warehouse.export.inboundHeaders.name'),
            translate(locale, 'warehouse.export.inboundHeaders.batch'),
            translate(locale, 'warehouse.export.inboundHeaders.quantity'),
            translate(locale, 'warehouse.export.inboundHeaders.uom'),
            translate(locale, 'warehouse.export.inboundHeaders.category'),
            translate(locale, 'warehouse.export.inboundHeaders.operator'),
            translate(locale, 'warehouse.export.inboundHeaders.remarks')
        ])

        headerRow.eachCell((cell) => {
            cell.font = { bold: true }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } }
        })

        data.forEach((item) => {
            const master = masterDataMap[item.materialId]
            if (!master) {
                console.error(`[EXPORT_INTEGRITY] Material/Product ID ${item.materialId} not found in masterDataMap while exporting Inbound.`)
            }
            sheet.addRow([
                item.entryDate,
                master?.code || '',
                master?.name || '',
                item.batchNo,
                item.quantity,
                master?.uom || '',
                item.targetCategory,
                item.operator,
                item.remarks
            ])
        })

        await this.download(
            workbook,
            translate(locale, 'warehouse.export.inboundFileName', {
                date: new Date().toISOString().split('T')[0]
            })
        )
    },

    async exportShipment(
        data: ShipmentRecord[],
        masterDataMap: Record<string, MasterDataSearchResult>,
        locale: AppLocale
    ) {
        const { default: ExcelJS } = await loadExcelJS()
        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet(translate(locale, 'warehouse.export.shipmentSheetName'))

        sheet.columns = [
            { width: 15, key: 'date' },
            { width: 20, key: 'order' },
            { width: 20, key: 'code' },
            { width: 25, key: 'name' },
            { width: 12, key: 'qty' },
            { width: 15, key: 'cat' },
            { width: 12, key: 'status' },
            { width: 12, key: 'operator' },
            { width: 25, key: 'remarks' },
        ]

        const headerRow = sheet.addRow([
            translate(locale, 'warehouse.export.shipmentHeaders.date'),
            translate(locale, 'warehouse.export.shipmentHeaders.order'),
            translate(locale, 'warehouse.export.shipmentHeaders.code'),
            translate(locale, 'warehouse.export.shipmentHeaders.name'),
            translate(locale, 'warehouse.export.shipmentHeaders.quantity'),
            translate(locale, 'warehouse.export.shipmentHeaders.category'),
            translate(locale, 'warehouse.export.shipmentHeaders.status'),
            translate(locale, 'warehouse.export.shipmentHeaders.operator'),
            translate(locale, 'warehouse.export.shipmentHeaders.remarks')
        ])

        headerRow.eachCell((cell) => {
            cell.font = { bold: true }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } }
        })

        const statusMap: Record<string, string> = {
            DRAFT: translate(locale, 'warehouse.export.status.draft'),
            COMMITTED: translate(locale, 'warehouse.export.status.committed'),
            VOID: translate(locale, 'warehouse.export.status.void'),
        }

        data.forEach((item) => {
            const master = masterDataMap[item.materialId]
            if (!master) {
                console.error(`[EXPORT_INTEGRITY] Material/Product ID ${item.materialId} not found in masterDataMap while exporting Shipment.`)
            }
            sheet.addRow([
                item.shipmentDate,
                item.orderNo,
                master?.code || '',
                master?.name || '',
                item.quantity,
                item.sourceCategory,
                statusMap[item.status] || item.status,
                item.operator,
                item.remarks
            ])
        })

        await this.download(
            workbook,
            translate(locale, 'warehouse.export.shipmentFileName', {
                date: new Date().toISOString().split('T')[0]
            })
        )
    },

    async download(workbook: any, filename: string) {
        try {
            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error('[EXPORT_DOWNLOAD_FAILED] Excel download execution failed:', error)
            throw error
        }
    }
}
