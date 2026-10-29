import { useLanguage } from '@/context/language-provider'
import type { ProductionMaterialIssuanceActiveMaterialProgress } from '../contracts/production-material-issuance-active-order-scope-progress-api-dto'

const progressFields = [
  ['standardQty', 'required'],
  ['issuedQty', 'issued'],
  ['returnedQty', 'returned'],
  ['netQty', 'netIssued'],
  ['remainingQty', 'remaining'],
  ['excessQty', 'aboveStandard'],
] as const

export function ProductionMaterialIssuanceSixQuantityProgressValues({
  progress,
}: {
  progress: Pick<
    ProductionMaterialIssuanceActiveMaterialProgress,
    (typeof progressFields)[number][0] | 'unit'
  >
}) {
  const { t, locale } = useLanguage()
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 })
  return (
    <dl className='grid min-w-0 grid-cols-2 gap-2 @xl:grid-cols-3 @4xl:grid-cols-6'>
      {progressFields.map(([field, label]) => (
        <div
          key={field}
          className={`min-w-0 rounded-xl p-2 ${field === 'remainingQty' ? 'bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100' : field === 'excessQty' && progress.excessQty > 0 ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100' : 'bg-muted/30'}`}
        >
          <dt className='text-xs leading-5'>
            {t(`mrp.productionMaterialIssuance.materials.headers.${label}`)}
          </dt>
          <dd className='mt-1 text-sm font-semibold break-words tabular-nums'>
            {number.format(progress[field])} {progress.unit}
          </dd>
        </div>
      ))}
    </dl>
  )
}
