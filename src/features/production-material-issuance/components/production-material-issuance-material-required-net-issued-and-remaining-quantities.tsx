import { useLanguage } from '@/context/language-provider'
import type { ProductionMaterialIssuanceActiveMaterialProgress } from '../contracts/production-material-issuance-active-order-scope-progress-api-dto'

type ProductionMaterialIssuanceVisibleMaterialQuantities = Pick<
  ProductionMaterialIssuanceActiveMaterialProgress,
  | 'materialId'
  | 'materialCode'
  | 'materialName'
  | 'unit'
  | 'standardQty'
  | 'netQty'
  | 'remainingQty'
  | 'excessQty'
> & { sourceLineCount?: number }

const primaryQuantityFields = [
  ['standardQty', 'required'],
  ['netQty', 'netIssued'],
  ['remainingQty', 'remaining'],
] as const

/** Keep each material and its three decision-making quantities visible together. */
export function ProductionMaterialIssuanceMaterialRequiredNetIssuedAndRemainingQuantities({
  materials,
}: {
  materials: ProductionMaterialIssuanceVisibleMaterialQuantities[]
}) {
  const { t, locale } = useLanguage()
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 })
  return (
    <div className='min-w-0 divide-y'>
      <div
        aria-hidden='true'
        className='hidden grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 bg-muted/40 px-3 py-2 text-xs text-muted-foreground @2xl:grid'
      >
        <span>
          {t('mrp.productionMaterialIssuance.materials.headers.material')}
        </span>
        <div className='grid grid-cols-3 gap-2 text-right'>
          {primaryQuantityFields.map(([, label]) => (
            <span key={label}>
              {t(
                `mrp.productionMaterialIssuance.workspace.quantities.${label}`
              )}
            </span>
          ))}
        </div>
      </div>
      {materials.map((material) => (
        <div
          key={material.materialId}
          className='grid min-w-0 gap-2 px-3 py-3 @2xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] @2xl:items-center @2xl:gap-3'
        >
          <div className='min-w-0 space-y-1'>
            <h3 className='text-sm font-medium break-words'>
              {material.materialName}
              <span className='ml-2 text-xs font-normal text-muted-foreground'>
                {material.materialCode} · {material.unit}
              </span>
            </h3>
            {material.sourceLineCount !== undefined && (
              <p className='text-xs text-muted-foreground'>
                {t(
                  'mrp.productionMaterialIssuance.activeProgress.sourceLines',
                  {
                    count: material.sourceLineCount,
                  }
                )}
              </p>
            )}
            {material.excessQty > 0 && (
              <p className='text-xs font-medium text-amber-800 dark:text-amber-200'>
                {t(
                  'mrp.productionMaterialIssuance.materials.headers.aboveStandard'
                )}{' '}
                {number.format(material.excessQty)} {material.unit}
              </p>
            )}
          </div>
          <dl className='grid min-w-0 grid-cols-3 gap-2 @2xl:text-right'>
            {primaryQuantityFields.map(([field, label]) => (
              <div
                key={field}
                className={`flex min-w-0 flex-col justify-between rounded-md px-1 py-1.5 @2xl:px-2 ${field === 'remainingQty' ? (material.remainingQty > 0 ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100') : ''}`}
              >
                <dt className='text-xs leading-5 @2xl:sr-only'>
                  {t(
                    `mrp.productionMaterialIssuance.workspace.quantities.${label}`
                  )}
                </dt>
                <dd className='text-base font-semibold break-words tabular-nums'>
                  {number.format(material[field])}
                  <span className='ml-1 text-xs font-normal'>
                    {material.unit}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}
