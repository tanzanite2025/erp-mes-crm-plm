import { useLanguage } from '@/context/language-provider'
import type { ProductionMaterialIssuanceReviewedSourceBasis } from '../contracts/production-material-issuance-source-review-and-frozen-document-api-dto'

/** Displays server quantities without calculating another set of material demand. */
export function ProductionMaterialIssuanceSourceBasisDetails({
  sources,
}: {
  sources: ProductionMaterialIssuanceReviewedSourceBasis[]
}) {
  const { t, locale } = useLanguage()
  return (
    <div className='space-y-3'>
      {sources.map((source) => (
        <details
          key={source.salesOrderLineId}
          className='min-w-0 rounded-2xl border border-dashed border-muted/50 bg-background/80 p-4'
        >
          <summary className='cursor-pointer text-xs leading-6 font-black wrap-break-word'>
            {source.orderNo} / {source.lineNo} · {source.productName}
          </summary>
          <dl className='mt-4 grid min-w-0 gap-3 text-[11px] leading-6 font-bold sm:grid-cols-2'>
            <div>
              <dt className='text-[9px] font-black tracking-wider text-muted-foreground/60'>
                {t('mrp.productionMaterialIssuance.frozenSources.quantity')}
              </dt>
              <dd>
                {source.finishedQty} {source.finishedUnit}
              </dd>
            </div>
            <div className='rounded-xl border border-dashed border-primary/20 bg-primary/5 px-3 py-2 text-primary'>
              <dt className='text-[9px] font-black tracking-wider'>
                {t('mrp.productionMaterialIssuance.frozenSources.weight')}
              </dt>
              <dd className='font-maple-ui text-xs font-black'>
                {source.bom.measuredWeight} {source.bom.measuredWeightUnit} ·{' '}
                {(locale === 'en-US'
                  ? source.bom.versionLevelLabelEn
                  : source.bom.versionLevelLabelZh) ||
                  source.bom.versionLevel ||
                  t(
                    'mrp.productionMaterialIssuance.frozenSources.unspecifiedVersion'
                  )}
              </dd>
            </div>
            <div className='min-w-0'>
              <dt className='text-[9px] font-black tracking-wider text-muted-foreground/60'>
                {t('mrp.productionMaterialIssuance.frozenSources.bom')}
              </dt>
              <dd className='wrap-break-word'>
                {source.bom.bomNo} · {source.bom.revisionNo} /{' '}
                {source.bom.bomVersion}
              </dd>
            </div>
            <div className='min-w-0'>
              <dt className='text-[9px] font-black tracking-wider text-muted-foreground/60'>
                {t('mrp.productionMaterialIssuance.frozenSources.owner')}
              </dt>
              <dd className='wrap-break-word'>
                {source.bom.ownerType === 'CUSTOMER'
                  ? t(
                      'mrp.productionMaterialIssuance.frozenSources.customerOwned'
                    )
                  : t(
                      'mrp.productionMaterialIssuance.frozenSources.internalOwned'
                    )}
                {source.customerName ? ` · ${source.customerName}` : ''}
              </dd>
            </div>
          </dl>
          <div className='mt-3 space-y-2'>
            <h4 className='text-[10px] font-black tracking-widest uppercase'>
              {t('mrp.productionMaterialIssuance.frozenSources.recipe')}
            </h4>
            {source.contributions.map((contribution) => (
              <div
                key={contribution.bomItemId}
                className='flex min-w-0 flex-wrap justify-between gap-x-4 gap-y-1 rounded-xl bg-muted/35 px-3 py-2 text-[11px] leading-6 font-bold'
              >
                <span className='min-w-0 wrap-break-word'>
                  {contribution.section} · {contribution.materialCode}{' '}
                  {contribution.materialName} {contribution.materialSpec}
                </span>
                <span>
                  {t(
                    'mrp.productionMaterialIssuance.frozenSources.standardUsage'
                  )}
                  : {contribution.standardUsage} {contribution.unit} ·{' '}
                  {t('mrp.productionMaterialIssuance.frozenSources.required')}:{' '}
                  {contribution.requiredQty} {contribution.unit}
                </span>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}
