import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { ProductionMaterialRequirementBomBasisReview } from '@/features/production-material-requirements/components/production-material-requirement-bom-basis-review'
import type { ProductionMaterialIssuanceSelectedSource } from '../contracts/production-material-issuance-source-selection-and-preparation-api-dto'
import { useProductionMaterialIssuanceSourceSelectionAndPreparation } from '../hooks/use-production-material-issuance-source-selection-and-preparation'
import { ProductionMaterialIssuanceOrderLineSourceSelection } from './production-material-issuance-order-line-source-selection'
import { ProductionMaterialIssuanceSourceBasisReviewAndDispatchWorkflow } from './production-material-issuance-source-basis-review-and-dispatch-workflow'

export function ProductionMaterialIssuanceSourceSelectionBomReviewAndDispatchWorkflow({
  actorId,
  initialSources,
}: {
  actorId: string
  initialSources: ProductionMaterialIssuanceSelectedSource[]
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const workflow = useProductionMaterialIssuanceSourceSelectionAndPreparation(
    actorId,
    initialSources
  )
  const {
    displayedPreparation,
    currentPreparation,
    preparationPending,
    preparationError,
  } = workflow
  return (
    <div className='min-w-0 space-y-5'>
      <p className='rounded-xl bg-muted/30 p-3 text-sm leading-6'>
        {t('mrp.productionMaterialIssuance.start.wholeLineScope')}
      </p>
      <ProductionMaterialIssuanceOrderLineSourceSelection workflow={workflow} />
      <Button
        disabled={
          workflow.selected.length < 1 ||
          workflow.selected.length > 500 ||
          preparationPending
        }
        onClick={workflow.prepareSelectedProductionMaterialIssuanceSources}
      >
        {t(
          preparationPending
            ? 'mrp.productionMaterialIssuance.start.preparing'
            : 'mrp.productionMaterialIssuance.start.prepare'
        )}
      </Button>
      {preparationError && (
        <p
          role='alert'
          className='rounded-xl bg-destructive/10 p-3 text-sm text-destructive'
        >
          {t('mrp.productionMaterialIssuance.start.prepareFailed')}{' '}
          {preparationError.message}
        </p>
      )}
      {displayedPreparation && (
        <>
          {!currentPreparation && (
            <p
              role='status'
              className='text-sm text-amber-800 dark:text-amber-200'
            >
              {t('mrp.productionMaterialIssuance.start.selectionChanged')}
            </p>
          )}
          <ProductionMaterialRequirementBomBasisReview
            scopeDescription={t(
              'mrp.productionMaterialIssuance.start.bomScope'
            )}
            incompleteDescription={t(
              'mrp.productionMaterialIssuance.start.bomIncomplete'
            )}
            recalculateLabel={t('mrp.productionMaterialIssuance.start.prepare')}
            sourceLines={displayedPreparation.sourceLines}
            selections={workflow.selected.flatMap((source) =>
              source.bomId
                ? [
                    {
                      salesOrderId: source.salesOrderId,
                      salesOrderLineId: source.salesOrderLineId,
                      bomId: source.bomId,
                    },
                  ]
                : []
            )}
            isComplete={Boolean(currentPreparation?.isReady)}
            isLoading={preparationPending}
            onSelectionChange={
              workflow.changeProductionMaterialIssuanceSelectedBom
            }
            onRecalculate={
              workflow.prepareSelectedProductionMaterialIssuanceSources
            }
          />
          {currentPreparation && currentPreparation.issues.length > 0 && (
            <section
              aria-label={t(
                'mrp.productionMaterialIssuance.start.prerequisitesTitle'
              )}
              className='space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30'
            >
              <h3 className='text-sm font-semibold'>
                {t('mrp.productionMaterialIssuance.start.prerequisitesTitle')}
              </h3>
              <ul className='space-y-2 text-sm leading-6'>
                {currentPreparation.issues.map((issue) => {
                  const source = currentPreparation.sourceLines.find(
                    (item) => item.salesOrderLineId === issue.salesOrderLineId
                  )
                  return (
                    <li key={`${issue.salesOrderLineId}/${issue.code}`}>
                      {source?.orderNo} / {source?.lineNo}：
                      {t(
                        issue.code === 'MISSING_PRODUCT' ||
                          issue.code === 'MISSING_FINISHED_UNIT' ||
                          issue.code === 'INVALID_SOURCE_VERSION' ||
                          issue.code === 'INVALID_FINISHED_WEIGHT'
                          ? `mrp.productionMaterialIssuance.start.prerequisites.${issue.code}`
                          : `mrp.requirements.basisReview.issues.${issue.code}`
                      )}
                    </li>
                  )
                })}
              </ul>
              <p className='text-xs leading-6'>
                {t('mrp.productionMaterialIssuance.start.repairHint')}
              </p>
              {matchesPathPermissionProjection(user, '/engineering/bom') && (
                <Link
                  to='/engineering/bom'
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  {t('mrp.productionMaterialIssuance.start.openBom')}
                </Link>
              )}
            </section>
          )}
        </>
      )}
      {currentPreparation?.isReady && !preparationPending && (
        <ProductionMaterialIssuanceSourceBasisReviewAndDispatchWorkflow
          key={workflow.preparationKey}
          sources={currentPreparation.sourceLines.map((source) => ({
            salesOrderId: source.salesOrderId,
            salesOrderLineId: source.salesOrderLineId,
            bomId: source.bom?.id ?? '',
          }))}
          isAnalysisReady
        />
      )}
    </div>
  )
}
