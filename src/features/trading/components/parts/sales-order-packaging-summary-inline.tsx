import { useEffect } from 'react'
import { Boxes, PackageSearch, TriangleAlert } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { failLoudly } from '@/lib/safe-catch'
import type { SalesOrderPackagingCardViewModel } from '../../utils/sales-order-packaging-card-view-model'

export function SalesOrderPackagingSummaryInline({
  viewModel,
}: {
  viewModel: SalesOrderPackagingCardViewModel
}) {
  const { t } = useLanguage()
  const { preview: data, isLoading, isError, error } = viewModel

  useEffect(() => {
    if (isError && error) {
      failLoudly(error, 'SalesOrderPackagingSummaryInline')
    }
  }, [error, isError])

  if (isError && error) {
    return (
      <div className='mt-2 inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/5 px-2 py-1 text-[8px] font-black text-rose-600'>
        <TriangleAlert className='size-3' />
        <span>{t('tradingSalesOrder.packagingPreview.summary.error')}</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='mt-2 inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/20 bg-muted/20 px-2 py-1 text-[8px] font-black text-muted-foreground'>
        <PackageSearch className='size-3' />
        <span>{t('tradingSalesOrder.packagingPreview.summary.loadingInline')}</span>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className='mt-2 flex flex-wrap gap-1.5'>
      <span className='inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[8px] font-black text-primary'>
        <Boxes className='size-3' />
        <span>
          {t('tradingSalesOrder.packagingPreview.summary.boxes')}: {data.summary.totalBoxCount}
        </span>
      </span>
      <span className='inline-flex items-center rounded-full border border-muted-foreground/15 bg-background/80 px-2 py-1 text-[8px] font-black text-muted-foreground'>
        {t('tradingSalesOrder.packagingPreview.summary.volume')}: {data.summary.totalVolume.toFixed(2)}
      </span>
      <span className='inline-flex items-center rounded-full border border-muted-foreground/15 bg-background/80 px-2 py-1 text-[8px] font-black text-muted-foreground'>
        {t('tradingSalesOrder.packagingPreview.summary.grossWeight')}: {data.summary.totalGrossWeight.toFixed(2)}
      </span>
      {data.summary.warnings.length > 0 && (
        <span className='inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[8px] font-black text-amber-700'>
          <TriangleAlert className='size-3' />
          <span>
            {t('tradingSalesOrder.packagingPreview.summary.warnings')}: {data.summary.warnings.length}
          </span>
        </span>
      )}
    </div>
  )
}
