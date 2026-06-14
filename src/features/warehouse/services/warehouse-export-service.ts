import { translate, type AppLocale } from '@/locales'
import {
  applyWorksheetHeaderRowStyle,
  createExcelWorkbook,
  downloadWorkbook,
} from '@/lib/excel/export'
import { createLogger } from '@/lib/logger'
import { type InboundRecord, type MasterDataSearchResult } from '../inventory'
import { type ShipmentRecord } from '../shipment'

const logger = createLogger('WarehouseExportService')

export const WarehouseExportService = {
  async exportInbound(
    data: InboundRecord[],
    masterDataMap: Record<string, MasterDataSearchResult>,
    locale: AppLocale
  ) {
    const workbook = await createExcelWorkbook()
    const sheet = workbook.addWorksheet(
      translate(locale, 'warehouse.export.inboundSheetName')
    )

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
      translate(locale, 'warehouse.export.inboundHeaders.remarks'),
    ])

    applyWorksheetHeaderRowStyle(headerRow, {
      fillColorArgb: 'FFEFEFEF',
      fontColorArgb: 'FF000000',
    })

    data.forEach((item) => {
      const master = masterDataMap[item.materialId]
      if (!master) {
        logger.error('Export integrity check failed while exporting inbound', {
          materialId: item.materialId,
          exportType: 'inbound',
        })
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
        item.remarks,
      ])
    })

    await downloadWorkbook(
      workbook,
      translate(locale, 'warehouse.export.inboundFileName', {
        date: new Date().toISOString().split('T')[0],
      })
    )
  },

  async exportShipment(
    data: ShipmentRecord[],
    masterDataMap: Record<string, MasterDataSearchResult>,
    locale: AppLocale
  ) {
    const workbook = await createExcelWorkbook()
    const sheet = workbook.addWorksheet(
      translate(locale, 'warehouse.export.shipmentSheetName')
    )

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
      translate(locale, 'warehouse.export.shipmentHeaders.remarks'),
    ])

    applyWorksheetHeaderRowStyle(headerRow, {
      fillColorArgb: 'FFEFEFEF',
      fontColorArgb: 'FF000000',
    })

    const statusMap: Record<string, string> = {
      DRAFT: translate(locale, 'warehouse.export.status.draft'),
      COMMITTED: translate(locale, 'warehouse.export.status.committed'),
      VOID: translate(locale, 'warehouse.export.status.void'),
    }

    data.forEach((item) => {
      const master = masterDataMap[item.materialId]
      if (!master) {
        logger.error('Export integrity check failed while exporting shipment', {
          materialId: item.materialId,
          exportType: 'shipment',
        })
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
        item.remarks,
      ])
    })

    await downloadWorkbook(
      workbook,
      translate(locale, 'warehouse.export.shipmentFileName', {
        date: new Date().toISOString().split('T')[0],
      })
    )
  },
}
