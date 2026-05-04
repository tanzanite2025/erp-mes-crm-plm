import React from 'react'
import { useLanguage } from '@/context/language-provider'
import { auditUtils } from '@/lib/audit-utils'
import { formatWarehouseDisplayDateTime } from '../utils/warehouse-date-display'

import { type InventoryAdjustment } from '../adjustment'

interface Props {
  data: InventoryAdjustment
}

export const AdjustmentPrint = React.forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
  const { t, locale } = useLanguage()
  const reporterName = auditUtils.formatOperatorName(data.createdBy) || data.createdBy
  const approvedName = data.approvedBy ? auditUtils.formatOperatorName(data.approvedBy) || data.approvedBy : t('warehouse.adjustment.audit.empty')
  const executedName = data.executedBy ? auditUtils.formatOperatorName(data.executedBy) || data.executedBy : t('warehouse.adjustment.audit.empty')

  return (
    <div ref={ref} className='p-8 bg-white text-black print:p-0 w-full max-w-[800px] mx-auto'>
      <div className='text-center mb-8 border-b-2 border-black pb-4'>
        <h1 className='text-2xl font-bold uppercase tracking-widest'>{t('warehouse.adjustment.printDocument.title')}</h1>
        <div className='flex justify-between mt-4 text-xs'>
          <span>{t('warehouse.adjustment.printDocument.documentNo')}: {data.adjustmentNo}</span>
          <span>{t('warehouse.adjustment.printDocument.printDate')}: {formatWarehouseDisplayDateTime(new Date(), locale)}</span>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4 mb-6 text-sm'>
        <div><span className='font-bold'>{t('warehouse.adjustment.printDocument.task')}:</span> {data.reason}</div>
        <div>
          <span className='font-bold'>{t('warehouse.adjustment.printDocument.businessType')}:</span>{' '}
          {data.type === 'STOCKTAKE'
            ? t('warehouse.adjustment.printDocument.typeStocktake')
            : t('warehouse.adjustment.printDocument.typeManual')}
        </div>
        <div><span className='font-bold'>{t('warehouse.adjustment.printDocument.reporter')}:</span> {reporterName}</div>
        <div><span className='font-bold'>{t('warehouse.adjustment.printDocument.createdAt')}:</span> {formatWarehouseDisplayDateTime(data.createdAt, locale)}</div>
        <div><span className='font-bold'>{t('warehouse.adjustment.printDocument.approvedBy')}:</span> {approvedName}</div>
        <div><span className='font-bold'>{t('warehouse.adjustment.printDocument.approvedAt')}:</span> {data.approvedAt ? formatWarehouseDisplayDateTime(data.approvedAt, locale) : t('warehouse.adjustment.audit.empty')}</div>
        <div><span className='font-bold'>{t('warehouse.adjustment.printDocument.executedBy')}:</span> {executedName}</div>
        <div><span className='font-bold'>{t('warehouse.adjustment.printDocument.executedAt')}:</span> {data.executedAt ? formatWarehouseDisplayDateTime(data.executedAt, locale) : t('warehouse.adjustment.audit.empty')}</div>
      </div>

      <table className='w-full border-collapse border border-black text-xs mb-8'>
        <thead>
          <tr className='bg-gray-100'>
            <th className='border border-black p-2'>{t('warehouse.adjustment.printDocument.columns.materialCode')}</th>
            <th className='border border-black p-2'>{t('warehouse.adjustment.printDocument.columns.materialName')}</th>
            <th className='border border-black p-2'>{t('warehouse.adjustment.printDocument.columns.batch')}</th>
            <th className='border border-black p-2 text-right'>{t('warehouse.adjustment.printDocument.columns.theoryQty')}</th>
            <th className='border border-black p-2 text-right'>{t('warehouse.adjustment.printDocument.columns.actualQty')}</th>
            <th className='border border-black p-2 text-right'>{t('warehouse.adjustment.printDocument.columns.diffQty')}</th>
            <th className='border border-black p-2'>{t('warehouse.adjustment.printDocument.columns.uom')}</th>
          </tr>
        </thead>
        <tbody>
          {data.items?.map((item, idx) => (
            <tr key={idx}>
              <td className='border border-black p-2 font-mono'>{item.materialCode}</td>
              <td className='border border-black p-2'>{item.materialName}</td>
              <td className='border border-black p-2 font-mono'>{item.batchNo || t('warehouse.adjustment.printDocument.batchFallback')}</td>
              <td className='border border-black p-2 text-right'>{item.theoryQty}</td>
              <td className='border border-black p-2 text-right'>{item.actualQty}</td>
              <td className='border border-black p-2 text-right font-bold'>
                {item.diffQty > 0 ? '+' : ''}{item.diffQty}
              </td>
              <td className='border border-black p-2 text-center'>{item.uom}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className='mt-12 grid grid-cols-4 gap-4 text-xs border-t border-dashed border-gray-400 pt-8'>
        <div className='flex flex-col gap-8'>
            <span>{t('warehouse.adjustment.printDocument.signatories.maker')}: ________________</span>
            <span className='text-gray-400'>{t('warehouse.adjustment.printDocument.signatories.date')}:</span>
        </div>
        <div className='flex flex-col gap-8'>
            <span>{t('warehouse.adjustment.printDocument.signatories.warehouseManager')}: ________________</span>
            <span className='text-gray-400'>{t('warehouse.adjustment.printDocument.signatories.date')}:</span>
        </div>
        <div className='flex flex-col gap-8'>
            <span>{t('warehouse.adjustment.printDocument.signatories.financeAudit')}: ________________</span>
            <span className='text-gray-400'>{t('warehouse.adjustment.printDocument.signatories.date')}:</span>
        </div>
        <div className='flex flex-col gap-8'>
            <span>{t('warehouse.adjustment.printDocument.signatories.generalManager')}: ________________</span>
            <span className='text-gray-400'>{t('warehouse.adjustment.printDocument.signatories.date')}:</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}} />
    </div>
  )
})

AdjustmentPrint.displayName = 'AdjustmentPrint'
