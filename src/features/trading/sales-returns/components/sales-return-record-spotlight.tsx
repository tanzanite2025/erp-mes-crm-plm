import { useState } from 'react'
import {
  Barcode,
  CalendarDays,
  FilePenLine,
  FileStack,
  PackageCheck,
  Truck,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'
import { SalesReturnActualAmountRecordHistorySection } from './sales-return-actual-amount-records/sales-return-actual-amount-record-history-section'
import { SalesReturnActualAmountSummaryCard } from './sales-return-actual-amount-records/sales-return-actual-amount-summary-card'
import { SalesReturnCreateSheet } from './sales-return-create-sheet'
import { SalesReturnLogisticsPanel } from './sales-return-logistics-panel'

type SalesReturnRecordSpotlightProps = {
  record?: SalesReturnRecord
  isLoading: boolean
  onClearSelection: () => void
}

export function SalesReturnRecordSpotlight({
  record,
  isLoading,
  onClearSelection,
}: SalesReturnRecordSpotlightProps) {
  const { t } = useLanguage()
  const [isEditOpen, setIsEditOpen] = useState(false)

  if (isLoading) {
    return (
      <Card className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 shadow-none'>
        <CardContent className='px-5 py-8 text-center text-sm font-bold text-muted-foreground'>
          {t('common.actions.loading')}
        </CardContent>
      </Card>
    )
  }

  if (!record) {
    return (
      <Card className='rounded-2xl border border-dashed border-border/70 bg-background/60 shadow-none'>
        <CardContent className='px-5 py-8 text-center'>
          <p className='text-sm font-black text-foreground'>
            {t('trading.salesReturns.queryShell.noSelectionTitle')}
          </p>
          <p className='mt-2 text-xs leading-6 font-bold text-muted-foreground'>
            {t('trading.salesReturns.queryShell.noSelectionDescription')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 shadow-none'>
      <CardHeader className='flex flex-row items-start justify-between gap-4 px-5 py-4'>
        <div>
          <CardTitle className='text-sm font-black tracking-tight text-foreground'>
            {t('trading.salesReturns.queryShell.editorPanelTitle')}
          </CardTitle>
          <p className='mt-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            {record.returnNo}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setIsEditOpen(true)}
            className='rounded-full text-[10px] font-black tracking-widest uppercase'
          >
            <FilePenLine className='mr-1 size-3.5' />
            {t('trading.salesReturns.queryShell.editAction')}
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onClearSelection}
            className='rounded-full text-[10px] font-black tracking-widest uppercase'
          >
            {t('trading.salesReturns.queryShell.closePanel')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-4 px-5 pb-5'>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <Truck className='size-3.5' />
              {t('trading.salesReturns.queryShell.trackingNo')}
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <p className='text-xs font-black text-foreground'>
                {record.trackingNo?.trim() || '--'}
              </p>
              {record.pendingTrackingFill ? (
                <span className='inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-600 uppercase'>
                  {t('trading.salesReturns.queryShell.pendingTrackingBadge')}
                </span>
              ) : null}
            </div>
          </div>

          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <Truck className='size-3.5' />
              {t('trading.salesReturns.queryShell.carrier')}
            </div>
            <p className='text-xs font-black text-foreground'>
              {record.carrier?.trim() || '--'}
            </p>
          </div>

          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <CalendarDays className='size-3.5' />
              {t('trading.salesReturns.queryShell.shippedAt')}
            </div>
            <p className='text-xs font-black text-foreground'>
              {record.shippedAt
                ? record.shippedAt.replace('T', ' ').slice(0, 16)
                : '--'}
            </p>
          </div>

          <div className='space-y-1 md:col-span-2'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <FileStack className='size-3.5' />
              {t('trading.salesReturns.queryShell.reason')}
            </div>
            <p className='text-xs leading-6 font-bold text-foreground'>
              {record.reason?.trim() ||
                t('trading.salesReturns.queryShell.emptyReason')}
            </p>
          </div>

          <div className='space-y-1 md:col-span-2'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <Truck className='size-3.5' />
              {t('trading.salesReturns.queryShell.logisticsNote')}
            </div>
            <p className='text-xs leading-6 font-bold text-foreground'>
              {record.logisticsNote?.trim() || '--'}
            </p>
          </div>

          <SalesReturnActualAmountSummaryCard record={record} />
        </div>

        <SalesReturnActualAmountRecordHistorySection
          salesReturnId={record.id}
        />

        <SalesReturnLogisticsPanel
          key={`${record.id}-${record.updatedAt}`}
          record={record}
        />

        <div className='rounded-[24px] border border-dashed border-border/70 bg-background/80 p-4'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <p className='text-xs font-black tracking-tight text-foreground'>
                退货执行追踪
              </p>
              <p className='mt-1 text-[11px] font-bold text-muted-foreground'>
                条码绑定和仓库入库事实均按退货明细行记录。
              </p>
            </div>
            <PackageCheck className='size-4 text-emerald-600' />
          </div>

          <div className='mt-4 space-y-3'>
            {record.lines.map((line) => {
              const inboundRecords = record.inboundRecords.filter(
                (inboundRecord) => inboundRecord.sourceLineId === line.id
              )
              return (
                <div
                  key={line.id}
                  className='rounded-[18px] border border-dashed border-muted/60 bg-muted/10 p-3'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='truncate text-xs font-black text-foreground'>
                        行 {line.lineNo} /{' '}
                        {line.productDisplayTitleSnapshot ||
                          line.productModel ||
                          line.productCode}
                      </p>
                      <p className='mt-1 text-[10px] font-bold text-muted-foreground'>
                        申请 {line.quantity.toLocaleString()} {line.uom} /
                        已入库 {line.receivedQuantity.toLocaleString()}{' '}
                        {line.uom}
                      </p>
                    </div>
                    <span className='shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-black text-emerald-700'>
                      {line.status}
                    </span>
                  </div>

                  <div className='mt-3 flex flex-wrap gap-2'>
                    {line.barcodes.length > 0 ? (
                      line.barcodes.map((barcode) => (
                        <span
                          key={barcode.id}
                          className='inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-black text-sky-700'
                        >
                          <Barcode className='mr-1 size-3' />
                          {barcode.normalizedCode}
                        </span>
                      ))
                    ) : (
                      <span className='rounded-full border border-dashed border-muted/50 px-2.5 py-1 text-[10px] font-bold text-muted-foreground'>
                        暂无退回条码
                      </span>
                    )}
                  </div>

                  {inboundRecords.length > 0 ? (
                    <div className='mt-3 space-y-1 border-t border-dashed border-muted/50 pt-3'>
                      {inboundRecords.map((inboundRecord) => (
                        <div
                          key={inboundRecord.id}
                          className='flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-muted-foreground'
                        >
                          <span className='text-emerald-700'>
                            入库 {inboundRecord.quantity.toLocaleString()}{' '}
                            {line.uom}
                          </span>
                          <span>
                            {inboundRecord.batchNo || '--'} /{' '}
                            {inboundRecord.inboundDate.slice(0, 10)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <SalesReturnCreateSheet
          mode='edit'
          record={record}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      </CardContent>
    </Card>
  )
}
