import { useLanguage } from '@/context/language-provider'
import { Card, CardContent } from '@/components/ui/card'
import { formatProductBindingBoundAtLabel } from '../product-binding-history-formatters'
import type { ProductBindingRecord } from '../services/product-binding-service'
import {
  HistoryProductBarcodeCell,
  HistoryQrCodeCell,
} from './product-binding-history-cell-renderers'
import { ProductBindingHistoryEmptyState } from './product-binding-history-empty-state'

export type ProductBindingHistoryTableProps = {
  items: ProductBindingRecord[]
  isLoading: boolean
  error: Error | null
  latestBindingId: string
  historyTotal: number
}

export function ProductBindingHistoryTable(
  props: ProductBindingHistoryTableProps
) {
  const { t, locale } = useLanguage()
  const { items, isLoading, error, latestBindingId, historyTotal } = props

  return (
    <Card className='h-full gap-0 rounded-[24px] border border-dashed border-border/70 bg-background shadow-none'>
      <CardContent className='flex h-full min-h-0 flex-col p-0'>
        <div className='flex items-center justify-between border-b border-dashed border-border/70 px-4 py-3'>
          <div className='flex flex-col gap-1'>
            <p className='text-sm font-black tracking-tighter text-foreground italic'>
              {t('cuttingOperations.productBinding.history.title')}
            </p>
            <p className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              {t('cuttingOperations.productBinding.history.description', {
                count: historyTotal,
              })}
            </p>
          </div>
        </div>

        {error ? (
          <div className='px-4 py-4 text-sm text-rose-600'>
            {t('cuttingOperations.productBinding.history.error', {
              message: error.message,
            })}
          </div>
        ) : null}

        <div className='min-h-0 flex-1 overflow-auto'>
          <table className='w-full min-w-[1040px] text-sm'>
            <colgroup>
              <col className='w-[112px]' />
              <col className='w-[220px]' />
              <col className='w-[180px]' />
              <col className='w-[160px]' />
              <col className='w-[140px]' />
              <col className='w-[120px]' />
              <col className='w-[160px]' />
            </colgroup>
            <thead className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <tr>
                <th className='sticky top-0 z-10 bg-background/95 px-3 py-3 text-center backdrop-blur'>
                  {t(
                    'cuttingOperations.productBinding.history.columns.prepregQrCode'
                  )}
                </th>
                <th className='sticky top-0 z-10 bg-background/95 px-4 py-3 text-left backdrop-blur'>
                  {t(
                    'cuttingOperations.productBinding.history.columns.productBarcode'
                  )}
                </th>
                <th className='sticky top-0 z-10 bg-background/95 px-4 py-3 text-left backdrop-blur'>
                  {t(
                    'cuttingOperations.productBinding.history.columns.supplierBatchNo'
                  )}
                </th>
                <th className='sticky top-0 z-10 bg-background/95 px-4 py-3 text-left backdrop-blur'>
                  {t(
                    'cuttingOperations.productBinding.history.columns.productionDate'
                  )}
                </th>
                <th className='sticky top-0 z-10 bg-background/95 px-4 py-3 text-left backdrop-blur'>
                  {t(
                    'cuttingOperations.productBinding.history.columns.boundBy'
                  )}
                </th>
                <th className='sticky top-0 z-10 bg-background/95 px-4 py-3 text-left backdrop-blur'>
                  {t('cuttingOperations.productBinding.history.columns.status')}
                </th>
                <th className='sticky top-0 z-10 bg-background/95 px-4 py-3 text-left backdrop-blur'>
                  {t(
                    'cuttingOperations.productBinding.history.columns.boundAt'
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className='px-4 py-6 text-muted-foreground' colSpan={7}>
                    {t('cuttingOperations.productBinding.history.loading')}
                  </td>
                </tr>
              ) : null}

              {!isLoading && !error && items.length === 0 ? (
                <tr>
                  <td className='p-0' colSpan={7}>
                    <ProductBindingHistoryEmptyState />
                  </td>
                </tr>
              ) : null}

              {!isLoading && !error
                ? items.map((item) => {
                    const isLatest = latestBindingId === item.id

                    return (
                      <tr
                        key={item.id}
                        className={`border-t border-dashed border-border/60 align-top ${isLatest ? 'bg-primary/5' : ''}`}
                      >
                        <td className='px-3 py-3'>
                          <HistoryQrCodeCell
                            code={
                              item.prepregQrCode || item.prepregBindingToken
                            }
                            isLatest={isLatest}
                            latestLabel={t(
                              'cuttingOperations.productBinding.history.latestBadge'
                            )}
                          />
                        </td>
                        <td className='px-4 py-3'>
                          <HistoryProductBarcodeCell
                            productBarcode={item.productBarcode}
                          />
                        </td>
                        <td className='px-4 py-3 font-mono text-[11px] text-foreground'>
                          {item.prepregRollInstance?.supplierBatchNo || '--'}
                        </td>
                        <td className='px-4 py-3 font-mono text-[11px] text-foreground'>
                          {item.prepregRollInstance?.productionDate || '--'}
                        </td>
                        <td className='px-4 py-3 font-mono text-[11px] text-foreground'>
                          {item.boundBy || '--'}
                        </td>
                        <td className='px-4 py-3'>
                          <span className='inline-flex h-5 items-center rounded-full bg-emerald-500/10 px-2 font-mono text-[8px] tracking-[0.16em] text-emerald-700 uppercase'>
                            {item.status || '--'}
                          </span>
                        </td>
                        <td className='px-4 py-3 font-mono text-[11px] text-foreground'>
                          {formatProductBindingBoundAtLabel(
                            item.boundAt,
                            locale
                          )}
                        </td>
                      </tr>
                    )
                  })
                : null}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
