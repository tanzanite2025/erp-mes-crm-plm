import { useLanguage } from '@/context/language-provider'
import type { ProductionMaterialIssuanceActiveMaterialProgress } from '../contracts/production-material-issuance-active-order-scope-progress-api-dto'
import { ProductionMaterialIssuanceMaterialRequiredNetIssuedAndRemainingQuantities } from './production-material-issuance-material-required-net-issued-and-remaining-quantities'
import { ProductionMaterialIssuanceSixQuantityProgressValues } from './production-material-issuance-six-quantity-progress-values'

export function ProductionMaterialIssuanceActiveScopeMaterialSummary({
  materials,
}: {
  materials?: ProductionMaterialIssuanceActiveMaterialProgress[]
}) {
  const { t } = useLanguage()
  return (
    <section
      aria-labelledby='production-issuance-materials-title'
      className='min-w-0 space-y-3'
    >
      <h2 id='production-issuance-materials-title' className='sr-only'>
        {t('mrp.productionMaterialIssuance.materials.title')}
      </h2>
      <p className='text-xs leading-5 text-muted-foreground'>
        {t('mrp.productionMaterialIssuance.materials.description')}
      </p>
      {materials?.length === 0 && (
        <p className='rounded-xl bg-muted/30 p-3 text-sm'>
          {t('mrp.productionMaterialIssuance.activeProgress.emptyMaterials')}
        </p>
      )}
      {materials && materials.length > 0 && (
        <div className='overflow-hidden rounded-xl border bg-card'>
          <ProductionMaterialIssuanceMaterialRequiredNetIssuedAndRemainingQuantities
            materials={materials}
          />
        </div>
      )}
      {materials && materials.length > 0 && (
        <details className='rounded-lg border px-3 py-2 text-xs'>
          <summary className='cursor-pointer font-medium text-muted-foreground'>
            {t('mrp.productionMaterialIssuance.workspace.materialDetails')}
          </summary>
          <div className='mt-3 space-y-3'>
            {materials.map((material) => (
              <article
                key={material.materialId}
                className='min-w-0 space-y-3 rounded-2xl border p-3'
              >
                <h3 className='text-sm font-semibold break-words'>
                  {material.materialCode} · {material.materialName}
                </h3>
                <p className='text-xs text-muted-foreground'>
                  {t(
                    'mrp.productionMaterialIssuance.activeProgress.sourceLines',
                    {
                      count: material.sourceLineCount,
                    }
                  )}
                </p>
                <ProductionMaterialIssuanceSixQuantityProgressValues
                  progress={material}
                />
              </article>
            ))}
          </div>
        </details>
      )}
      <p className='text-xs leading-5 text-muted-foreground'>
        {t('mrp.productionMaterialIssuance.materials.progressHint')}
      </p>
    </section>
  )
}
