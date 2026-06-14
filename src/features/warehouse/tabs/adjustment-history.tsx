'use client'

import { useRef } from 'react'
import {
  RefreshCw,
  FileText,
  Printer,
  CheckCircle2,
  History,
  Search,
} from 'lucide-react'
import { auditUtils } from '@/lib/audit-utils'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { type InventoryAdjustment } from '../adjustment'
import { AdjustmentPrint } from '../components/adjustment-print'
import { useAdjustmentHistoryViewModel } from '../hooks/use-adjustment-history-view-model'
import { formatWarehouseDisplayDateTime } from '../utils/warehouse-date-display'
import { getAdjustmentStatusMeta } from '../utils/warehouse-status-display'

export function AdjustmentHistory() {
  const { t, locale } = useLanguage()
  const printRef = useRef<HTMLDivElement>(null)
  const {
    adjustments,
    isLoading,
    error,
    selectedAdj,
    previewOpen,
    executeConfirmOpen,
    executeConfirmDesc,
    handleExecuteClick,
    handleConfirmExecute,
    handleExecuteConfirmOpenChange,
    handleRefreshClick,
    handleOpenPreview,
    handleClosePreview,
    handlePreviewOpenChange,
    isExecuting,
  } = useAdjustmentHistoryViewModel()

  const handlePrint = () => {
    window.print()
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        title={t('warehouse.adjustment.title')}
        description={t('warehouse.adjustment.subtitle')}
        icon={FileText}
      />

      <div className='flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center'>
        <div className='flex w-full items-center gap-2 overflow-hidden rounded-full border border-dashed border-muted/50 bg-muted/10 px-3 py-2 text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase sm:w-auto md:px-4 md:text-[10px]'>
          <Search className='size-3 shrink-0 md:size-3.5' />
          <span className='truncate'>{t('warehouse.adjustment.filter')}</span>
        </div>
        <div className='flex items-center justify-end gap-3'>
          <Button
            variant='ghost'
            size='icon'
            onClick={handleRefreshClick}
            className='size-9 shrink-0 rounded-full hover:bg-muted md:size-10'
          >
            <RefreshCw
              className={cn(
                'size-3.5 text-muted-foreground md:size-4',
                isLoading && 'animate-spin'
              )}
            />
          </Button>
        </div>
      </div>

      <div className='overflow-hidden rounded-2xl border border-dashed border-muted/50 bg-muted/5 shadow-inner md:rounded-[32px]'>
        <div className='flex items-center justify-between border-b border-dashed border-muted/50 bg-muted/20 px-5 py-4 md:px-8 md:py-5'>
          <div className='flex items-center gap-2 overflow-hidden'>
            <History className='size-4 shrink-0 text-amber-600' />
            <h3 className='truncate text-base font-black tracking-tighter text-foreground uppercase italic md:text-lg'>
              {t('warehouse.adjustment.flowTitle')}
            </h3>
          </div>
          <p className='hidden text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase italic sm:block'>
            {t('warehouse.adjustment.auditData')}
          </p>
        </div>
        <div className='scrollbar-hide overflow-x-auto p-0'>
          <ScrollArea className='h-[600px]'>
            <Table className='min-w-[800px] md:min-w-0'>
              <TableHeader className='h-12 bg-muted/30 md:h-14'>
                <TableRow className='border-b border-dashed border-muted/50 hover:bg-transparent'>
                  <TableHead className='pl-5 text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:pl-8 md:text-[10px]'>
                    {t('warehouse.adjustment.columns.orderId')}
                  </TableHead>
                  <TableHead className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[10px]'>
                    {t('warehouse.adjustment.columns.type')}
                  </TableHead>
                  <TableHead className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[10px]'>
                    {t('warehouse.adjustment.columns.nodes')}
                  </TableHead>
                  <TableHead className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[10px]'>
                    {t('warehouse.adjustment.columns.status')}
                  </TableHead>
                  <TableHead className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[10px]'>
                    {t('warehouse.adjustment.columns.owner')}
                  </TableHead>
                  <TableHead className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[10px]'>
                    {t('warehouse.adjustment.columns.timestamp')}
                  </TableHead>
                  <TableHead className='pr-5 text-right text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase md:pr-8 md:text-[10px]'>
                    {t('warehouse.adjustment.columns.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className='h-64 text-center'>
                      <RefreshCw className='mx-auto size-8 animate-spin text-amber-600 opacity-20' />
                    </TableCell>
                  </TableRow>
                ) : adjustments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='h-64 text-center'>
                      <Search className='mx-auto mb-4 size-12 opacity-5' />
                      <p className='text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                        {t('warehouse.adjustment.empty')}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  adjustments?.map((adj: InventoryAdjustment) => {
                    const ownerName =
                      auditUtils.formatOperatorName(adj.createdBy) ||
                      adj.createdBy
                    return (
                      <TableRow
                        key={adj.id}
                        className='group border-muted/50 transition-colors hover:bg-muted/30'
                      >
                        <TableCell className='max-w-[120px] truncate py-2 pl-5 font-mono text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase transition-colors group-hover:text-amber-600 md:py-2.5 md:pl-8 md:text-[10px]'>
                          {adj.adjustmentNo}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant='outline'
                            className='h-4 rounded-full border-none bg-muted px-2 text-[8px] font-black tracking-widest whitespace-nowrap uppercase md:h-5 md:px-3 md:text-[9px]'
                          >
                            {adj.type === 'STOCKTAKE'
                              ? t('warehouse.adjustment.typeStocktake')
                              : t('warehouse.adjustment.typeManual')}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-[11px] font-black tracking-tight whitespace-nowrap text-muted-foreground uppercase md:text-[12px]'>
                          {adj.totalItems}
                        </TableCell>
                        <TableCell>
                          <AuditStatusDisplay
                            meta={getAdjustmentStatusMeta(t, adj.status)}
                            badgeClassName='h-5 px-3'
                          />
                        </TableCell>
                        <TableCell className='py-2 whitespace-nowrap md:py-2.5'>
                          <div className='flex flex-col gap-1'>
                            <span className='text-[10px] font-bold text-foreground/80 md:text-[11px]'>
                              {ownerName}
                            </span>
                            <span className='text-[8px] text-muted-foreground/50 md:text-[9px]'>
                              {t('warehouse.adjustment.audit.approvedBy')}:{' '}
                              {adj.approvedBy ||
                                t('warehouse.adjustment.audit.empty')}
                            </span>
                            <span className='text-[8px] text-muted-foreground/50 md:text-[9px]'>
                              {t('warehouse.adjustment.audit.executedBy')}:{' '}
                              {adj.executedBy ||
                                t('warehouse.adjustment.audit.empty')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className='py-2 font-mono text-[8px] whitespace-nowrap text-muted-foreground/40 md:py-2.5 md:text-[9px]'>
                          <div className='flex flex-col gap-1'>
                            <span>
                              {formatWarehouseDisplayDateTime(
                                adj.createdAt,
                                locale
                              )}
                            </span>
                            <span>
                              {t('warehouse.adjustment.audit.approvedAt')}:{' '}
                              {adj.approvedAt
                                ? formatWarehouseDisplayDateTime(
                                    adj.approvedAt,
                                    locale
                                  )
                                : t('warehouse.adjustment.audit.empty')}
                            </span>
                            <span>
                              {t('warehouse.adjustment.audit.executedAt')}:{' '}
                              {adj.executedAt
                                ? formatWarehouseDisplayDateTime(
                                    adj.executedAt,
                                    locale
                                  )
                                : t('warehouse.adjustment.audit.empty')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className='space-x-2 py-2 pr-5 text-right whitespace-nowrap md:py-2.5 md:pr-8'>
                          {adj.status === 'APPROVED' && (
                            <Button
                              size='sm'
                              variant='ghost'
                              className='h-8 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 text-[9px] font-black tracking-widest text-emerald-600 uppercase hover:bg-emerald-500/10 md:h-9 md:px-4 md:text-[10px]'
                              onClick={() => handleExecuteClick(adj)}
                            >
                              <CheckCircle2 className='mr-1.5 size-3 md:mr-2' />{' '}
                              {t('warehouse.adjustment.execute')}
                            </Button>
                          )}
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-8 gap-2 rounded-full bg-muted/50 px-3 text-[9px] font-black tracking-widest uppercase hover:bg-muted md:h-9 md:px-4 md:text-[10px]'
                            onClick={() => handleOpenPreview(adj)}
                          >
                            <Printer className='size-3' />{' '}
                            {t('warehouse.adjustment.print')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={handlePreviewOpenChange}>
        <DialogContent className='w-[95vw] overflow-hidden rounded-2xl border-none p-0 shadow-2xl sm:max-w-[900px] md:rounded-[32px]'>
          <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-amber-600/5 via-transparent' />

          <div className='relative p-5 md:p-8'>
            <DialogHeader className='mb-4 text-left md:mb-6 print:hidden'>
              <DialogTitle className='flex items-center gap-3 truncate text-lg font-black tracking-tighter uppercase md:gap-4 md:text-xl'>
                <div className='flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 md:size-10 md:rounded-xl'>
                  <Printer className='size-4 text-amber-600 md:size-5' />
                </div>
                {t('warehouse.adjustment.previewTitle')}
              </DialogTitle>
              <DialogDescription className='mt-1 block truncate text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:text-[9px]'>
                {t('warehouse.adjustment.previewSubtitle')}
              </DialogDescription>
            </DialogHeader>

            <div className='mb-6 max-h-[50vh] overflow-y-auto rounded-xl border border-dashed border-muted bg-card p-4 shadow-inner md:mb-8 md:max-h-[60vh] md:rounded-[24px] md:p-8'>
              {selectedAdj && (
                <div className='print-content origin-top scale-[0.85] md:scale-100'>
                  <AdjustmentPrint data={selectedAdj} ref={printRef} />
                </div>
              )}
            </div>

            <DialogFooter className='flex flex-row items-center justify-end gap-3 bg-transparent md:gap-4 print:hidden'>
              <Button
                variant='ghost'
                className='h-10 flex-1 rounded-full px-4 text-[9px] font-black tracking-widest uppercase transition-colors hover:bg-muted sm:flex-none md:h-12 md:px-8 md:text-[10px]'
                onClick={handleClosePreview}
              >
                {t('warehouse.adjustment.close')}
              </Button>
              <Button
                className='h-10 flex-1 gap-2 rounded-full bg-amber-600 px-4 text-[9px] font-black tracking-widest uppercase shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-700 active:scale-95 sm:flex-none md:h-12 md:px-8 md:text-[10px]'
                onClick={handlePrint}
              >
                <Printer className='size-3.5 md:size-4' />{' '}
                {t('warehouse.adjustment.print')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={executeConfirmOpen}
        onOpenChange={handleExecuteConfirmOpenChange}
        title={t('warehouse.adjustment.execute')}
        desc={executeConfirmDesc}
        handleConfirm={handleConfirmExecute}
        isLoading={isExecuting}
      />
    </div>
  )
}
