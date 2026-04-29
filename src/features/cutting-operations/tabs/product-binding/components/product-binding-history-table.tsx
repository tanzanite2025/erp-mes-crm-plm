import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import type { ProductBindingRecord } from '../services/product-binding-service'

type ProductBindingHistoryTableProps = {
  items: ProductBindingRecord[]
  isLoading: boolean
  error: Error | null
  latestBindingId: string
  historyTotal: number
}

export function ProductBindingHistoryTable(props: ProductBindingHistoryTableProps) {
  const { t } = useLanguage()
  const { items, isLoading, error, latestBindingId, historyTotal } = props

  return (
    <Card className='rounded-[24px] border border-dashed border-border/70 bg-background shadow-none'>
      <CardContent className='p-0'>
        <div className='flex items-center justify-between border-b border-dashed border-border/70 px-5 py-4'>
          <div className='flex flex-col gap-1'>
            <p className='text-sm font-black italic tracking-tighter text-foreground'>
              {t('cuttingOperations.productBinding.history.title')}
            </p>
            <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('cuttingOperations.productBinding.history.description', { count: historyTotal })}
            </p>
          </div>
        </div>

        {error ? (
          <div className='px-5 py-6 text-sm text-rose-600'>
            {t('cuttingOperations.productBinding.history.error', { message: error.message })}
          </div>
        ) : null}

        <div className='overflow-x-auto'>
          <table className='w-full min-w-[1320px] text-sm'>
            <thead className='bg-muted/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              <tr>
                <th className='px-5 py-3 text-left'>
                  {t('cuttingOperations.productBinding.history.columns.bindingId')}
                </th>
                <th className='px-5 py-3 text-left'>
                  {t('cuttingOperations.productBinding.history.columns.execution')}
                </th>
                <th className='px-5 py-3 text-left'>
                  {t('cuttingOperations.productBinding.history.columns.productBarcode')}
                </th>
                <th className='px-5 py-3 text-left'>
                  {t('cuttingOperations.productBinding.history.columns.prepregToken')}
                </th>
                <th className='px-5 py-3 text-left'>
                  {t('cuttingOperations.productBinding.history.columns.protocol')}
                </th>
                <th className='px-5 py-3 text-left'>
                  {t('cuttingOperations.productBinding.history.columns.summary')}
                </th>
                <th className='px-5 py-3 text-left'>
                  {t('cuttingOperations.productBinding.history.columns.boundBy')}
                </th>
                <th className='px-5 py-3 text-left'>
                  {t('cuttingOperations.productBinding.history.columns.status')}
                </th>
                <th className='px-5 py-3 text-left'>
                  {t('cuttingOperations.productBinding.history.columns.boundAt')}
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className='px-5 py-6 text-muted-foreground' colSpan={9}>
                    {t('cuttingOperations.productBinding.history.loading')}
                  </td>
                </tr>
              ) : null}

              {!isLoading && !error && items.length === 0 ? (
                <tr>
                  <td className='px-5 py-6 text-muted-foreground' colSpan={9}>
                    {t('cuttingOperations.productBinding.history.empty')}
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
                        <td className='px-5 py-4'>
                          <div className='flex flex-col gap-2'>
                            <span className='text-[11px] font-mono text-foreground'>{item.id || '--'}</span>
                            {isLatest ? (
                              <span className='inline-flex h-5 w-fit items-center rounded-full bg-emerald-500/10 px-2 text-[8px] font-mono uppercase tracking-[0.16em] text-emerald-700'>
                                {t('cuttingOperations.productBinding.history.latestBadge')}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className='px-5 py-4 text-[11px] font-mono text-foreground'>
                          {[item.prepregRollInstance?.specCode, item.prepregRollInstance?.supplierBatchNo, item.prepregRollInstance?.boxNo]
                            .filter(Boolean)
                            .join(' / ') || item.prepregBindingToken || '--'}
                        </td>
                        <td className='px-5 py-4 text-[11px] font-mono text-foreground'>
                          {item.productBarcode || '--'}
                        </td>
                        <td className='px-5 py-4 text-[11px] font-mono text-foreground'>
                          {item.prepregBindingToken || '--'}
                        </td>
                        <td className='px-5 py-4 text-[11px] font-mono text-foreground'>
                          {item.barcodeProtocol || '--'}
                        </td>
                        <td className='px-5 py-4 text-slate-700'>{item.barcodeSummary || '--'}</td>
                        <td className='px-5 py-4 text-[11px] font-mono text-foreground'>
                          {item.boundBy || '--'}
                        </td>
                        <td className='px-5 py-4'>
                          <span className='inline-flex h-5 items-center rounded-full bg-emerald-500/10 px-2 text-[8px] font-mono uppercase tracking-[0.16em] text-emerald-700'>
                            {item.status || '--'}
                          </span>
                        </td>
                        <td className='px-5 py-4 text-[11px] font-mono text-foreground'>
                          {item.boundAt || '--'}
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
