import { useEffect } from 'react'
import type { TranslationKey } from '@/locales'
import { Boxes, PackageSearch, TriangleAlert } from 'lucide-react'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import type { SalesOrderPackagingCardViewModel } from '../../utils/sales-order-packaging-card-view-model'

function localizePackagingWarning(
  warning: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
) {
  if (warning === 'Order line is missing product binding.') {
    return t(
      'tradingSalesOrder.packagingPreview.warnings.missingProductBinding'
    )
  }
  if (warning === 'No packaging profiles matched this product.') {
    return t('tradingSalesOrder.packagingPreview.warnings.noMatchedProfiles')
  }
  if (warning === 'Packaging selection is pending for this order line.') {
    return '该订单行尚未完成包装选择'
  }
  if (warning === 'No packaging profiles provided.') {
    return t('tradingSalesOrder.packagingPreview.warnings.noProfilesProvided')
  }
  if (warning === 'Packaging profiles use inconsistent dimension units.') {
    return t(
      'tradingSalesOrder.packagingPreview.warnings.inconsistentDimensionUnits'
    )
  }
  if (warning === 'Packaging profiles use inconsistent weight units.') {
    return t(
      'tradingSalesOrder.packagingPreview.warnings.inconsistentWeightUnits'
    )
  }
  if (
    warning ===
    'Remaining quantity could not be packed exactly with current packaging profiles.'
  ) {
    return t('tradingSalesOrder.packagingPreview.warnings.remainingQuantity')
  }
  if (warning.includes('has invalid capacity and was ignored.')) {
    return t('tradingSalesOrder.packagingPreview.warnings.invalidCapacity')
  }
  return warning
}

export function SalesOrderPackagingPreviewCard({
  viewModel,
}: {
  viewModel: SalesOrderPackagingCardViewModel
}) {
  const { t } = useLanguage()
  const { preview: data, isLoading, isError, error } = viewModel

  useEffect(() => {
    if (isError && error) {
      failLoudly(error, 'SalesOrderPackagingPreviewCard')
    }
  }, [error, isError])

  if (isError && error) {
    return (
      <div className='flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[10px] font-medium text-amber-800'>
        <TriangleAlert className='size-4 text-amber-700' />
        <span className='font-black tracking-wide uppercase'>
          {t('tradingSalesOrder.packagingPreview.title')}
        </span>
        <span>{t('tradingSalesOrder.packagingPreview.summary.error')}</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className='flex items-center gap-2 rounded-lg border border-dashed border-muted/50 px-3 py-2 text-[10px] text-muted-foreground'>
        <Boxes className='size-4 text-primary' />
        <span className='font-black tracking-wide uppercase'>
          {t('tradingSalesOrder.packagingPreview.title')}
        </span>
        <span>{t('tradingSalesOrder.packagingPreview.loading')}</span>
      </div>
    )
  }

  if (!data || data.lines.length === 0) {
    return (
      <div className='flex items-center gap-2 rounded-lg border border-dashed border-muted/50 px-3 py-2 text-[10px] text-muted-foreground'>
        <Boxes className='size-4 text-primary' />
        <span className='font-black tracking-wide uppercase'>
          {t('tradingSalesOrder.packagingPreview.title')}
        </span>
        <span>{t('tradingSalesOrder.packagingPreview.empty')}</span>
      </div>
    )
  }

  return (
    <section className='space-y-1.5'>
      <div className='flex flex-wrap items-center justify-between gap-2 px-1'>
        <div className='flex items-center gap-1.5'>
          <Boxes className='size-4 text-primary' />
          <h4 className='text-[11px] font-black tracking-wide uppercase'>
            {t('tradingSalesOrder.packagingPreview.title')}
          </h4>
        </div>
        <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-black text-muted-foreground'>
          <span>
            {t('tradingSalesOrder.packagingPreview.summary.boxes')}:{' '}
            {data.summary.totalBoxCount}
          </span>
          <span>
            {t('tradingSalesOrder.packagingPreview.summary.volume')}:{' '}
            {data.summary.totalVolume.toFixed(2)}
          </span>
          <span>
            {t('tradingSalesOrder.packagingPreview.summary.grossWeight')}:{' '}
            {data.summary.totalGrossWeight.toFixed(2)}
          </span>
        </div>
      </div>

      <div className='space-y-1.5'>
        {data.lines.map((item) => (
          <div
            key={item.key}
            className='rounded-xl border bg-background/80 p-2'
          >
            <div className='flex flex-wrap items-start justify-between gap-2'>
              <div>
                <div className='flex items-center gap-2'>
                  <PackageSearch className='size-4 text-primary' />
                  <span className='text-[12px] font-black tracking-tight'>
                    #{item.lineNo}{' '}
                    {item.productDisplayTitle ||
                      t('tradingSalesOrder.packagingPreview.unknownProduct')}
                  </span>
                </div>
                {item.productDisplaySubtitle ? (
                  <p className='mt-1 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                    {item.productDisplaySubtitle}
                  </p>
                ) : null}
                <p className='mt-1 text-[10px] font-medium text-muted-foreground'>
                  {t('tradingSalesOrder.packagingPreview.lineQuantity', {
                    qty: item.qty,
                    uom: item.uom || '-',
                  })}
                </p>
              </div>
              <div className='flex flex-wrap gap-1.5 text-[10px] font-black'>
                <span className='rounded-full border px-2 py-0.5'>
                  {t('tradingSalesOrder.packagingPreview.summary.boxes')}:{' '}
                  {item.plan.boxCount}
                </span>
                <span className='rounded-full border px-2 py-0.5'>
                  {t('tradingSalesOrder.packagingPreview.lineRemainder')}:{' '}
                  {item.plan.remainderQuantity}
                </span>
                <span className='rounded-full border px-2 py-0.5'>
                  {t('tradingSalesOrder.packagingPreview.lineProfiles')}:{' '}
                  {item.matchedProfileCount}
                </span>
              </div>
            </div>

            {item.plan.lines.length > 0 ? (
              <div className='mt-1.5 grid gap-1.5 md:grid-cols-2'>
                {item.plan.lines.map((line) => (
                  <div
                    key={`${item.key}-${line.profileId}`}
                    className='rounded-lg border border-dashed bg-muted/20 p-1.5'
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <span className='text-[11px] font-black'>
                        {line.profileName}
                      </span>
                      <span className='text-[10px] font-bold text-muted-foreground'>
                        {line.capacity}/{item.uom || '-'}
                      </span>
                    </div>
                    <div className='mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-medium text-muted-foreground'>
                      <p>
                        {t('tradingSalesOrder.packagingPreview.lineBoxCount', {
                          count: line.boxCount,
                        })}
                      </p>
                      <p>
                        {t(
                          'tradingSalesOrder.packagingPreview.linePackedQuantity',
                          { qty: line.packedQuantity }
                        )}
                      </p>
                      <p>
                        {t('tradingSalesOrder.packagingPreview.lineVolume', {
                          value: line.totalVolume.toFixed(2),
                        })}
                      </p>
                      <p>
                        {t(
                          'tradingSalesOrder.packagingPreview.lineGrossWeightValue',
                          { value: line.totalGrossWeight.toFixed(2) }
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='mt-1.5 rounded-lg border border-dashed bg-muted/20 px-2 py-1.5 text-[10px] font-medium text-muted-foreground'>
                {t('tradingSalesOrder.packagingPreview.noMatchedProfiles')}
              </div>
            )}

            {item.plan.warnings.length > 0 && (
              <div className='mt-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2'>
                <div className='mb-2 flex items-center gap-2 text-amber-700'>
                  <TriangleAlert className='size-4' />
                  <span className='text-[10px] font-black tracking-wide uppercase'>
                    {t('tradingSalesOrder.packagingPreview.warningTitle')}
                  </span>
                </div>
                <div className='space-y-1 text-[10px] font-medium text-amber-800'>
                  {item.plan.warnings.map((warning, index) => (
                    <p key={`${item.key}-warning-${index}`}>
                      {localizePackagingWarning(warning, t)}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
