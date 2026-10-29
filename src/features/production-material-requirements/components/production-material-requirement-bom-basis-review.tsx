import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import type {
  ProductionMaterialRequirementBomSelection,
  ProductionMaterialRequirementSourceLine,
} from '@/features/production-material-requirements/contracts/production-material-requirement-source-bom-and-contribution-api-dto'

interface ProductionMaterialRequirementBomBasisReviewProps {
  sourceLines: ProductionMaterialRequirementSourceLine[]
  selections: ProductionMaterialRequirementBomSelection[]
  isComplete: boolean
  isLoading: boolean
  onSelectionChange: (
    selection: ProductionMaterialRequirementBomSelection
  ) => void
  onRecalculate: () => void
  scopeDescription?: string
  incompleteDescription?: string
  recalculateLabel?: string
}

export function ProductionMaterialRequirementBomBasisReview({
  sourceLines,
  selections,
  isComplete,
  isLoading,
  onSelectionChange,
  onRecalculate,
  scopeDescription,
  incompleteDescription,
  recalculateLabel,
}: ProductionMaterialRequirementBomBasisReviewProps) {
  const { t, locale } = useLanguage()
  const formatPerformanceVersionLabel = (
    bom: NonNullable<ProductionMaterialRequirementSourceLine['bom']>
  ) =>
    (locale === 'en-US' ? bom.versionLevelLabelEn : bom.versionLevelLabelZh) ||
    bom.versionLevel ||
    t('mrp.requirements.basisReview.unspecifiedVersion')
  if (sourceLines.length === 0) return null
  return (
    <section
      aria-label={t('mrp.requirements.basisReview.title')}
      className='mb-4 space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-50'
    >
      <h2 className='text-sm font-semibold'>
        {t('mrp.requirements.basisReview.title')}
      </h2>
      <p className='text-xs leading-6'>
        {scopeDescription ?? t('mrp.requirements.basisReview.scope')}
      </p>
      {!isComplete && (
        <p
          role='status'
          className='rounded-lg bg-amber-100 p-3 text-sm text-amber-950'
        >
          {incompleteDescription ??
            t('mrp.requirements.basisReview.incomplete')}
        </p>
      )}
      <details open={!isComplete}>
        <summary className='cursor-pointer text-sm font-medium'>
          {t('mrp.requirements.basisReview.sources', {
            count: sourceLines.length,
          })}
        </summary>
        <div className='mt-3 space-y-3'>
          {sourceLines.map((source) => {
            const selected = selections.find(
              (selection) =>
                selection.salesOrderId === source.salesOrderId &&
                selection.salesOrderLineId === source.salesOrderLineId
            )
            const value = selected?.bomId ?? source.bom?.id ?? ''
            const validValue = source.bomCandidates.some(
              (candidate) => candidate.id === value
            )
              ? value
              : ''
            const label = `${source.orderNo} / ${source.lineNo} · ${source.productName}`
            return (
              <div
                key={`${source.salesOrderId}/${source.salesOrderLineId}`}
                className='min-w-0 space-y-2 rounded-xl border border-sky-200 bg-background p-3 dark:border-sky-800'
              >
                <p className='text-sm font-medium wrap-break-word'>{label}</p>
                {source.bomCandidates.length > 1 ||
                source.issueCode === 'BOM_SELECTION_CHANGED' ? (
                  <select
                    aria-label={label}
                    value={validValue}
                    disabled={isLoading}
                    className='min-h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm'
                    onChange={(event) => {
                      if (event.target.value)
                        onSelectionChange({
                          salesOrderId: source.salesOrderId,
                          salesOrderLineId: source.salesOrderLineId,
                          bomId: event.target.value,
                        })
                    }}
                  >
                    <option value='' disabled>
                      {t('mrp.requirements.basisReview.chooseBom')}
                    </option>
                    {source.bomCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.bomNo} ·{' '}
                        {formatPerformanceVersionLabel(candidate)} ·{' '}
                        {candidate.revisionNo} / {candidate.bomVersion} ·{' '}
                        {candidate.measuredWeight}{' '}
                        {candidate.measuredWeightUnit}
                      </option>
                    ))}
                  </select>
                ) : source.bom ? (
                  <p className='text-xs leading-6'>
                    {source.bom.bomNo} ·{' '}
                    {formatPerformanceVersionLabel(source.bom)} ·{' '}
                    {source.bom.revisionNo} / {source.bom.bomVersion} ·{' '}
                    {source.bom.measuredWeight} {source.bom.measuredWeightUnit}
                  </p>
                ) : null}
                {source.issueCode && (
                  <p className='text-xs leading-6 text-amber-800 dark:text-amber-200'>
                    {t(
                      `mrp.requirements.basisReview.issues.${source.issueCode}`
                    )}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </details>
      <Button
        type='button'
        variant='outline'
        disabled={isLoading}
        onClick={onRecalculate}
      >
        {recalculateLabel ?? t('mrp.requirements.basisReview.recalculate')}
      </Button>
    </section>
  )
}
