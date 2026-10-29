import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import type { ProductionMaterialIssuanceSourceSelection } from '../contracts/production-material-issuance-source-review-and-frozen-document-api-dto'
import { useProductionMaterialIssuanceSourceReview } from '../hooks/use-production-material-issuance-source-review-and-document-queries'
import { ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel } from './production-material-issuance-reviewed-basis-explicit-dispatch-command-panel'
import { ProductionMaterialIssuanceSourceBasisDetails } from './production-material-issuance-source-basis-details'

interface ProductionMaterialIssuanceSourceBasisReviewAndDispatchWorkflowProps {
  sources: ProductionMaterialIssuanceSourceSelection[]
  isAnalysisReady: boolean
}

// Remount whenever the parent analysis changes, so an old review cannot appear
// under another scope. Only an explicit button click starts the read-only POST.
export function ProductionMaterialIssuanceSourceBasisReviewAndDispatchWorkflow(
  props: ProductionMaterialIssuanceSourceBasisReviewAndDispatchWorkflowProps
) {
  const { allowsAction } = usePermissionActions()
  if (!allowsAction('action_production_material_issuance_view')) return null
  return <AuthorizedProductionMaterialIssuanceSourceReviewPanel {...props} />
}

function AuthorizedProductionMaterialIssuanceSourceReviewPanel({
  sources,
  isAnalysisReady,
}: ProductionMaterialIssuanceSourceBasisReviewAndDispatchWorkflowProps) {
  const { t } = useLanguage()
  const review = useProductionMaterialIssuanceSourceReview()
  return (
    <section
      aria-label={t('mrp.productionMaterialIssuance.sourceReview.title')}
      className='mb-4 space-y-3 rounded-2xl border border-dashed bg-card p-4'
    >
      <h2 className='text-sm font-semibold'>
        {t('mrp.productionMaterialIssuance.sourceReview.title')}
      </h2>
      <p className='text-xs leading-6 text-muted-foreground'>
        {t('mrp.productionMaterialIssuance.sourceReview.description')}
      </p>
      <Button
        type='button'
        variant='outline'
        className='h-auto min-h-9 max-w-full whitespace-normal'
        disabled={
          !isAnalysisReady ||
          sources.length < 1 ||
          sources.length > 500 ||
          review.isPending
        }
        onClick={() => review.mutate(sources)}
      >
        {t(
          review.isPending
            ? 'mrp.productionMaterialIssuance.sourceReview.loading'
            : 'mrp.productionMaterialIssuance.sourceReview.action'
        )}
      </Button>
      {sources.length > 500 && (
        <p role='status' className='text-sm text-amber-800 dark:text-amber-200'>
          {t('mrp.productionMaterialIssuance.sourceReview.limit')}
        </p>
      )}
      {review.isError && (
        <div
          role='alert'
          className='space-y-1 rounded-xl bg-destructive/10 p-3 text-sm text-destructive'
        >
          <p>{t('mrp.productionMaterialIssuance.sourceReview.failed')}</p>
          <p className='wrap-break-word'>{review.error.message}</p>
        </div>
      )}
      {review.isSuccess && (
        <>
          <p role='status' className='text-sm font-medium'>
            {t('mrp.productionMaterialIssuance.sourceReview.success', {
              count: review.data.sources.length,
            })}
          </p>
          <ProductionMaterialIssuanceSourceBasisDetails
            sources={review.data.sources}
          />
          {isAnalysisReady && (
            <ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel
              key={review.submittedAt}
              sources={review.data.sources}
            />
          )}
        </>
      )}
    </section>
  )
}
