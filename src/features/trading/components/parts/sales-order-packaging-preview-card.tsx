import { Boxes, PackageSearch, TriangleAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import type { TranslationKey } from '@/locales'
import { failLoudly } from '@/lib/safe-catch'
import type { SalesOrder } from '../../data/schema'
import { useSalesOrderPackagingPreview } from '../../hooks/use-sales-order-packaging-preview'

function localizePackagingWarning(
  warning: string,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
) {
  if (warning === 'Order line is missing product binding.') {
    return t('tradingSalesOrder.packagingPreview.warnings.missingProductBinding')
  }
  if (warning === 'No packaging profiles matched this product.') {
    return t('tradingSalesOrder.packagingPreview.warnings.noMatchedProfiles')
  }
  if (warning === 'No packaging profiles provided.') {
    return t('tradingSalesOrder.packagingPreview.warnings.noProfilesProvided')
  }
  if (warning === 'Packaging profiles use inconsistent dimension units.') {
    return t('tradingSalesOrder.packagingPreview.warnings.inconsistentDimensionUnits')
  }
  if (warning === 'Packaging profiles use inconsistent weight units.') {
    return t('tradingSalesOrder.packagingPreview.warnings.inconsistentWeightUnits')
  }
  if (warning === 'Remaining quantity could not be packed exactly with current packaging profiles.') {
    return t('tradingSalesOrder.packagingPreview.warnings.remainingQuantity')
  }
  if (warning.includes('has invalid capacity and was ignored.')) {
    return t('tradingSalesOrder.packagingPreview.warnings.invalidCapacity')
  }
  return warning
}

export function SalesOrderPackagingPreviewCard({ order }: { order: SalesOrder }) {
  const { t } = useLanguage()
  const { data, isLoading, isError, error } = useSalesOrderPackagingPreview(order)

  if (isError && error) {
    failLoudly(error, 'SalesOrderPackagingPreviewCard')
    throw error
  }

  if (isLoading) {
    return (
      <Card className='overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 shadow-inner backdrop-blur-sm'>
        <CardContent className='px-5 py-4'>
          <div className='flex items-center gap-2'>
            <Boxes className='size-4 text-primary' />
            <h4 className='text-[10px] font-black uppercase tracking-widest'>
              {t('tradingSalesOrder.packagingPreview.title')}
            </h4>
          </div>
          <p className='mt-3 text-[10px] text-muted-foreground'>
            {t('tradingSalesOrder.packagingPreview.loading')}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.lines.length === 0) {
    return (
      <Card className='overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 shadow-inner backdrop-blur-sm'>
        <CardContent className='px-5 py-4'>
          <div className='flex items-center gap-2'>
            <Boxes className='size-4 text-primary' />
            <h4 className='text-[10px] font-black uppercase tracking-widest'>
              {t('tradingSalesOrder.packagingPreview.title')}
            </h4>
          </div>
          <p className='mt-3 text-[10px] text-muted-foreground'>
            {t('tradingSalesOrder.packagingPreview.empty')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 shadow-inner backdrop-blur-sm'>
      <CardContent className='p-0'>
        <div className='flex items-center justify-between border-b bg-muted/10 px-5 py-2.5'>
          <div className='flex items-center gap-2'>
            <Boxes className='size-4 text-primary' />
            <h4 className='text-[10px] font-black uppercase tracking-widest'>
              {t('tradingSalesOrder.packagingPreview.title')}
            </h4>
          </div>
          <div className='flex items-center gap-4 text-[10px] font-bold text-muted-foreground'>
            <span>{t('tradingSalesOrder.packagingPreview.summary.boxes')}: {data.summary.totalBoxCount}</span>
            <span>{t('tradingSalesOrder.packagingPreview.summary.volume')}: {data.summary.totalVolume.toFixed(2)}</span>
            <span>{t('tradingSalesOrder.packagingPreview.summary.grossWeight')}: {data.summary.totalGrossWeight.toFixed(2)}</span>
          </div>
        </div>

        <div className='grid gap-3 px-5 py-4 md:grid-cols-3'>
          <div className='rounded-2xl border bg-background/70 p-3'>
            <p className='text-[9px] font-black uppercase tracking-wider text-muted-foreground'>
              {t('tradingSalesOrder.packagingPreview.summary.packagedLines')}
            </p>
            <p className='mt-2 text-xl font-black'>{data.summary.packagedLineCount}</p>
          </div>
          <div className='rounded-2xl border bg-background/70 p-3'>
            <p className='text-[9px] font-black uppercase tracking-wider text-muted-foreground'>
              {t('tradingSalesOrder.packagingPreview.summary.unpackagedLines')}
            </p>
            <p className='mt-2 text-xl font-black'>{data.summary.unpackagedLineCount}</p>
          </div>
          <div className='rounded-2xl border bg-background/70 p-3'>
            <p className='text-[9px] font-black uppercase tracking-wider text-muted-foreground'>
              {t('tradingSalesOrder.packagingPreview.summary.warnings')}
            </p>
            <p className='mt-2 text-xl font-black'>{data.summary.warnings.length}</p>
          </div>
        </div>

        <div className='space-y-3 px-5 pb-5'>
          {data.lines.map((item) => (
            <div key={item.key} className='rounded-2xl border bg-background/80 p-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <div className='flex items-center gap-2'>
                    <PackageSearch className='size-4 text-primary' />
                    <span className='text-[11px] font-black tracking-tight'>
                      #{item.lineNo} {item.productModel || t('tradingSalesOrder.packagingPreview.unknownProduct')}
                    </span>
                  </div>
                  <p className='mt-1 text-[10px] text-muted-foreground'>
                    {t('tradingSalesOrder.packagingPreview.lineQuantity', {
                      qty: item.qty,
                      uom: item.uom || '-',
                    })}
                  </p>
                </div>
                <div className='flex flex-wrap gap-2 text-[10px]'>
                  <span className='rounded-full border px-2 py-1'>
                    {t('tradingSalesOrder.packagingPreview.summary.boxes')}: {item.plan.boxCount}
                  </span>
                  <span className='rounded-full border px-2 py-1'>
                    {t('tradingSalesOrder.packagingPreview.lineRemainder')}: {item.plan.remainderQuantity}
                  </span>
                  <span className='rounded-full border px-2 py-1'>
                    {t('tradingSalesOrder.packagingPreview.lineProfiles')}: {item.matchedProfileCount}
                  </span>
                </div>
              </div>

              <div className='mt-3 grid gap-2 md:grid-cols-2'>
                {item.plan.lines.length > 0 ? (
                  item.plan.lines.map((line) => (
                    <div key={`${item.key}-${line.profileId}`} className='rounded-xl border border-dashed bg-muted/20 p-3'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='text-[10px] font-black'>{line.profileName}</span>
                        <span className='text-[9px] text-muted-foreground'>
                          {line.capacity}/{item.uom || '-'}
                        </span>
                      </div>
                      <div className='mt-2 space-y-1 text-[10px] text-muted-foreground'>
                        <p>{t('tradingSalesOrder.packagingPreview.lineBoxCount', { count: line.boxCount })}</p>
                        <p>{t('tradingSalesOrder.packagingPreview.linePackedQuantity', { qty: line.packedQuantity })}</p>
                        <p>{t('tradingSalesOrder.packagingPreview.lineVolume', { value: line.totalVolume.toFixed(2) })}</p>
                        <p>{t('tradingSalesOrder.packagingPreview.lineGrossWeightValue', { value: line.totalGrossWeight.toFixed(2) })}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='rounded-xl border border-dashed bg-muted/20 p-3 text-[10px] text-muted-foreground'>
                    {t('tradingSalesOrder.packagingPreview.noMatchedProfiles')}
                  </div>
                )}
              </div>

              {item.plan.warnings.length > 0 && (
                <div className='mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3'>
                  <div className='mb-2 flex items-center gap-2 text-amber-700'>
                    <TriangleAlert className='size-4' />
                    <span className='text-[10px] font-black uppercase tracking-wider'>
                      {t('tradingSalesOrder.packagingPreview.warningTitle')}
                    </span>
                  </div>
                  <div className='space-y-1 text-[10px] text-amber-800'>
                    {item.plan.warnings.map((warning, index) => (
                      <p key={`${item.key}-warning-${index}`}>{localizePackagingWarning(warning, t)}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className='mt-3 flex items-center justify-between rounded-xl border border-dashed bg-muted/10 px-3 py-2 text-[10px] text-muted-foreground'>
                <span>{t('tradingSalesOrder.packagingPreview.actionSlotHint')}</span>
                <span>{t('tradingSalesOrder.packagingPreview.actionSlotReserved')}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
