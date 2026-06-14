'use client'

import { useQuery } from '@tanstack/react-query'
import { Boxes, Loader2, TriangleAlert } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InventoryCoreService } from '../inventory/services/inventory-core-service'
import { warehouseQueryKeys } from '../query-keys'

interface BOMAlertDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatQuantity(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

export function BOMAlertDetailsDialog({
  open,
  onOpenChange,
}: BOMAlertDetailsDialogProps) {
  const { t } = useLanguage()
  const bomAlertDetailsQuery = useQuery({
    queryKey: warehouseQueryKeys.inventoryBOMAlertDetails(),
    queryFn: () => InventoryCoreService.getBOMAlertDetails(),
    enabled: open,
  })

  const detailList = bomAlertDetailsQuery.data
  const items = detailList?.items ?? []
  const total = detailList?.total ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='w-[96vw] overflow-hidden rounded-[32px] border-none p-0 shadow-2xl sm:max-w-[1120px]'
      >
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
        <div className='relative flex max-h-[90vh] flex-col'>
          <div className='shrink-0 px-6 pt-6 md:px-8 md:pt-8'>
            <DialogHeader className='text-left'>
              <DialogTitle className='text-lg font-black tracking-tighter uppercase italic md:text-xl'>
                {t('warehouse.stock.bomAlertDetails.title')}
              </DialogTitle>
              <DialogDescription className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                {t('warehouse.stock.bomAlertDetails.description')}
              </DialogDescription>
            </DialogHeader>

            <div className='mt-5 rounded-[24px] border border-dashed border-muted/50 bg-muted/10 p-5'>
              <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <div className='space-y-2'>
                  <p className='text-sm font-black tracking-tighter text-foreground uppercase italic'>
                    {t('warehouse.stock.bomAlertDetails.summary', {
                      count: total,
                    })}
                  </p>
                  <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    {t('warehouse.stock.bomAlertDetails.shortageTitle')}
                  </p>
                </div>
                <Badge className='h-5 rounded-full border-none bg-blue-500/10 px-2 text-[8px] font-black tracking-widest text-blue-600 uppercase'>
                  <Boxes className='mr-1 size-3' />
                  {total}
                </Badge>
              </div>
            </div>
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-8'>
            {bomAlertDetailsQuery.isPending ? (
              <div className='flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-dashed border-muted/50 bg-muted/5 px-6 text-center'>
                <Loader2 className='size-8 animate-spin text-primary/40' />
                <p className='mt-4 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {t('warehouse.stock.bomAlertDetails.loadingTitle')}
                </p>
                <p className='mt-3 max-w-xl text-[11px] leading-5 font-bold text-muted-foreground/70'>
                  {t('warehouse.stock.bomAlertDetails.loadingHint')}
                </p>
              </div>
            ) : bomAlertDetailsQuery.isError ? (
              <div className='flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
                <TriangleAlert className='size-8 text-rose-600' />
                <p className='mt-4 text-[10px] font-black tracking-widest text-rose-700 uppercase'>
                  {t('warehouse.stock.bomAlertDetails.errorTitle')}
                </p>
                <p className='mt-3 max-w-2xl text-[11px] leading-5 font-bold text-rose-700/80'>
                  {bomAlertDetailsQuery.error instanceof Error
                    ? bomAlertDetailsQuery.error.message
                    : t('warehouse.stock.bomAlertDetails.errorTitle')}
                </p>
                <Button
                  type='button'
                  variant='outline'
                  className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black tracking-widest uppercase'
                  onClick={() => {
                    void bomAlertDetailsQuery.refetch()
                  }}
                >
                  {t('warehouse.stock.bomAlertDetails.retry')}
                </Button>
              </div>
            ) : items.length === 0 ? (
              <div className='flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-dashed border-muted/50 bg-muted/5 px-6 text-center'>
                <Boxes className='size-12 text-muted-foreground/20' />
                <p className='mt-4 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                  {t('warehouse.stock.bomAlertDetails.emptyTitle')}
                </p>
                <p className='mt-3 max-w-xl text-[11px] leading-5 font-bold text-muted-foreground/70'>
                  {t('warehouse.stock.bomAlertDetails.emptyDescription')}
                </p>
              </div>
            ) : (
              <div className='space-y-5'>
                {items.map((detail) => (
                  <div
                    key={detail.ruleId}
                    className='relative overflow-hidden rounded-[24px] border border-dashed border-muted/60 bg-background p-5'
                  >
                    <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
                    <div className='relative space-y-5'>
                      <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                        <div className='min-w-0 space-y-2'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <h3 className='truncate text-sm font-black tracking-tighter uppercase italic md:text-base'>
                              {detail.productName || detail.bomNo}
                            </h3>
                            <Badge className='h-5 rounded-full border-none bg-primary/10 px-2 text-[8px] font-black tracking-widest text-primary uppercase'>
                              {detail.bomNo}
                            </Badge>
                          </div>
                          <div className='font-mono text-[8px] text-muted-foreground/60'>
                            {detail.productSku || detail.productId || '--'}
                          </div>
                        </div>

                        <div className='flex flex-wrap gap-2'>
                          <Badge className='h-5 rounded-full border-none bg-blue-500/10 px-2 text-[8px] font-black tracking-widest text-blue-600 uppercase'>
                            {t(
                              'warehouse.stock.bomAlertDetails.thresholdLabel'
                            )}
                            : {formatQuantity(detail.thresholdQty)}
                          </Badge>
                          <Badge
                            variant='outline'
                            className='h-5 rounded-full border-dashed border-muted/50 bg-background/80 px-2 text-[8px] font-black tracking-widest text-muted-foreground/70 uppercase'
                          >
                            {t('warehouse.stock.bomAlertDetails.triggeredAt')}:{' '}
                            {formatDateTime(detail.triggeredAt)}
                          </Badge>
                        </div>
                      </div>

                      <div className='rounded-[20px] border border-dashed border-muted/50 bg-muted/10 p-4'>
                        <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                            {t('warehouse.stock.bomAlertDetails.shortageTitle')}
                          </p>
                          <Badge className='h-5 rounded-full border-none bg-rose-500/10 px-2 text-[8px] font-black tracking-widest text-rose-600 uppercase'>
                            {detail.shortages.length}
                          </Badge>
                        </div>

                        <Table className='min-w-[720px]'>
                          <TableHeader className='bg-muted/30'>
                            <TableRow className='border-b border-dashed hover:bg-transparent'>
                              <TableHead className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                                {t(
                                  'warehouse.stock.bomAlertDetails.columns.material'
                                )}
                              </TableHead>
                              <TableHead className='text-right text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                                {t(
                                  'warehouse.stock.bomAlertDetails.columns.requiredQty'
                                )}
                              </TableHead>
                              <TableHead className='text-right text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                                {t(
                                  'warehouse.stock.bomAlertDetails.columns.currentStock'
                                )}
                              </TableHead>
                              <TableHead className='text-right text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                                {t(
                                  'warehouse.stock.bomAlertDetails.columns.shortageQty'
                                )}
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {detail.shortages.map((shortage) => (
                              <TableRow
                                key={`${detail.ruleId}-${shortage.materialId}`}
                                className='border-dashed'
                              >
                                <TableCell className='whitespace-normal'>
                                  <div className='min-w-[200px]'>
                                    <div className='text-[11px] font-black tracking-tighter text-foreground'>
                                      {shortage.materialName}
                                    </div>
                                    <div className='mt-1 font-mono text-[8px] text-muted-foreground/60'>
                                      {shortage.materialCode}
                                    </div>
                                    <div className='mt-1 text-[9px] font-bold tracking-widest text-muted-foreground/60 uppercase'>
                                      {shortage.materialSpec || '--'}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className='text-right font-mono text-[11px] font-black'>
                                  {formatQuantity(shortage.requiredQty)}
                                </TableCell>
                                <TableCell className='text-right font-mono text-[11px] font-black'>
                                  {formatQuantity(shortage.currentStock)}
                                </TableCell>
                                <TableCell className='text-right font-mono text-[11px] font-black text-rose-600'>
                                  {formatQuantity(shortage.shortageQty)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className='shrink-0 px-6 pb-6 md:px-8 md:pb-8'>
            <Button
              type='button'
              variant='ghost'
              className='h-11 rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
              onClick={() => onOpenChange(false)}
            >
              {t('warehouse.stock.bomAlertDetails.close')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
