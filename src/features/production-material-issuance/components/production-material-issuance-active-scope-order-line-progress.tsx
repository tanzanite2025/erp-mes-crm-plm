import { useLanguage } from '@/context/language-provider'
import type { ProductionMaterialIssuanceActiveOrderLineProgress } from '../contracts/production-material-issuance-active-order-scope-progress-api-dto'
import { ProductionMaterialIssuanceMaterialRequiredNetIssuedAndRemainingQuantities } from './production-material-issuance-material-required-net-issued-and-remaining-quantities'
import { ProductionMaterialIssuanceSixQuantityProgressValues } from './production-material-issuance-six-quantity-progress-values'

export function ProductionMaterialIssuanceActiveScopeOrderLineProgress({
  orderLines,
}: {
  orderLines?: ProductionMaterialIssuanceActiveOrderLineProgress[]
}) {
  const { t, locale } = useLanguage()
  return (
    <section
      aria-labelledby='production-issuance-orders-title'
      className='min-w-0 space-y-3'
    >
      <h2 id='production-issuance-orders-title' className='sr-only'>
        {t('mrp.productionMaterialIssuance.orderProgress.title')}
      </h2>
      {orderLines?.length === 0 && (
        <p className='rounded-xl bg-muted/30 p-3 text-sm'>
          {t('mrp.productionMaterialIssuance.activeProgress.emptyOrders')}
        </p>
      )}
      {orderLines?.map((line) => (
        <article
          key={line.salesOrderLineId}
          aria-label={`${line.orderNo} · ${line.lineNo} · ${line.productName}`}
          className={`min-w-0 overflow-hidden rounded-xl border bg-card ${line.issueCode ? 'border-amber-300 dark:border-amber-800' : ''}`}
        >
          <header className='flex flex-wrap items-start justify-between gap-x-4 gap-y-1 bg-muted/25 px-3 py-2 text-sm leading-6 break-words'>
            <div className='min-w-0'>
              <h3 className='font-semibold'>
                {line.orderNo} · {line.lineNo} · {line.productName}
              </h3>
              <p className='text-xs text-muted-foreground'>
                {line.customerName} ·{' '}
                {new Intl.NumberFormat(locale, {
                  maximumFractionDigits: 6,
                }).format(line.finishedQty)}{' '}
                {line.finishedUnit}
              </p>
            </div>
            <p className='max-w-full min-w-0 text-xs break-all text-muted-foreground'>
              <span className='@xl:hidden'>
                {t(
                  line.documentNo
                    ? 'mrp.productionMaterialIssuance.documentList.dispatched'
                    : 'mrp.productionMaterialIssuance.activeProgress.undispatched'
                )}
              </span>
              <span className='hidden @xl:inline'>
                {line.documentNo ||
                  t(
                    'mrp.productionMaterialIssuance.activeProgress.undispatched'
                  )}
              </span>
            </p>
          </header>
          {line.issueCode && (
            <p
              role='alert'
              className='bg-amber-50 px-3 py-3 text-sm font-medium text-amber-900 dark:bg-amber-950/30 dark:text-amber-100'
            >
              {t(`mrp.requirements.basisReview.issues.${line.issueCode}`)}
              <span className='mt-1 block text-xs font-normal'>
                {t(
                  'mrp.productionMaterialIssuance.workspace.unknownQuantities'
                )}
              </span>
            </p>
          )}
          {line.materials.length > 0 && (
            <ProductionMaterialIssuanceMaterialRequiredNetIssuedAndRemainingQuantities
              materials={line.materials}
            />
          )}
          <details className='border-t px-3 py-2 text-xs'>
            <summary className='w-fit cursor-pointer font-medium text-muted-foreground'>
              {t('mrp.productionMaterialIssuance.workspace.orderDetails')}
            </summary>
            <div className='mt-3 space-y-3'>
              {line.documentNo && (
                <p className='break-all'>{line.documentNo}</p>
              )}
              {line.bom && (
                <p className='text-xs leading-6 break-words'>
                  {line.bom.bomNo} · {line.bom.revisionNo} ·{' '}
                  {(locale === 'zh-CN'
                    ? line.bom.versionLevelLabelZh
                    : line.bom.versionLevelLabelEn) ||
                    line.bom.versionLevel}{' '}
                  · {line.bom.measuredWeight} {line.bom.measuredWeightUnit}
                </p>
              )}
              <p className='text-xs text-muted-foreground'>
                {t(
                  line.documentId
                    ? 'mrp.productionMaterialIssuance.activeProgress.frozenBasis'
                    : 'mrp.productionMaterialIssuance.activeProgress.currentBasis'
                )}
              </p>
              {line.materials.map((material) => (
                <article
                  key={material.materialId}
                  className='min-w-0 space-y-2 rounded-xl border bg-background p-3'
                >
                  <h3 className='text-sm font-semibold break-words'>
                    {material.materialCode} · {material.materialName}
                  </h3>
                  <ProductionMaterialIssuanceSixQuantityProgressValues
                    progress={material}
                  />
                </article>
              ))}
            </div>
          </details>
        </article>
      ))}
      <p role='note' className='text-xs leading-5 text-muted-foreground'>
        {t('mrp.productionMaterialIssuance.workspace.quantityHint')}
      </p>
      <p className='text-xs leading-5 text-muted-foreground'>
        {t('mrp.productionMaterialIssuance.orderProgress.allocationHint')}
      </p>
    </section>
  )
}
