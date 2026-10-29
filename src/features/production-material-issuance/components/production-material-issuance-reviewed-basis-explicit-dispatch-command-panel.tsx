import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import type { ProductionMaterialIssuanceReviewedSourceBasis } from '../contracts/production-material-issuance-source-review-and-frozen-document-api-dto'
import { useProductionMaterialIssuanceReviewedBasisDispatch } from '../hooks/use-production-material-issuance-explicit-dispatch-withdrawal-and-stable-request-retry'
import { useProductionMaterialIssuanceDocumentDetail } from '../hooks/use-production-material-issuance-source-review-and-document-queries'
import { ProductionMaterialIssuanceCommandFailureAndStableRetryGuidance } from './production-material-issuance-command-failure-and-stable-retry-guidance'
import { ProductionMaterialIssuanceSourceBasisDetails } from './production-material-issuance-source-basis-details'

export function ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel({
  sources,
}: {
  sources: ProductionMaterialIssuanceReviewedSourceBasis[]
}) {
  const { allowsAction } = usePermissionActions()
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  if (
    !actorId ||
    !allowsAction('action_production_material_issuance_view') ||
    !allowsAction('action_production_material_issuance_dispatch')
  )
    return null
  const scope = sources
    .map((source) => `${source.salesOrderLineId}/${source.basisFingerprint}`)
    .sort()
    .join(',')
  return (
    <AuthorizedProductionMaterialIssuanceReviewedBasisDispatchCommandPanel
      key={`${actorId}/${scope}`}
      sources={sources}
    />
  )
}

function AuthorizedProductionMaterialIssuanceReviewedBasisDispatchCommandPanel({
  sources,
}: {
  sources: ProductionMaterialIssuanceReviewedSourceBasis[]
}) {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const [confirmed, setConfirmed] = useState(false)
  const command = useProductionMaterialIssuanceReviewedBasisDispatch(sources)
  const submittedResult = command.current?.data
  const currentDocument = useProductionMaterialIssuanceDocumentDetail(
    submittedResult?.document.id ?? null
  )
  const result = currentDocument.data ?? submittedResult
  const pending = command.current?.status === 'pending'
  const prepared = Boolean(command.current?.request)
  return (
    <section
      aria-label={t('mrp.productionMaterialIssuance.commands.dispatchTitle')}
      className='min-w-0 space-y-3 rounded-xl border border-primary/20 bg-sky-50/50 p-3 dark:bg-sky-950/25'
    >
      <h3 className='text-sm font-semibold'>
        {t('mrp.productionMaterialIssuance.commands.dispatchTitle')}
      </h3>
      {result ? (
        <div className='space-y-3'>
          {currentDocument.isError ? (
            <p role='alert' className='text-sm wrap-anywhere text-destructive'>
              {t('mrp.productionMaterialIssuance.documentList.failed')}{' '}
              {currentDocument.error.message}
            </p>
          ) : (
            <p role='status' className='text-sm font-medium wrap-anywhere'>
              {t(
                result.document.status === 'DISPATCHED'
                  ? 'mrp.productionMaterialIssuance.commands.dispatched'
                  : 'mrp.productionMaterialIssuance.commands.originalAlreadyWithdrawn'
              )}{' '}
              {result.document.documentNo}
            </p>
          )}
          <p className='text-xs leading-6 text-muted-foreground'>
            {t('mrp.productionMaterialIssuance.commands.dispatchResultHint')}
          </p>
          {!currentDocument.isError &&
            result.document.status === 'DISPATCHED' &&
            (matchesPathPermissionProjection(
              user,
              '/warehouse/production-material-handovers'
            ) ? (
              <Link
                to='/warehouse/production-material-handovers'
                search={{ documentId: result.document.id }}
                className={buttonVariants({
                  className:
                    'h-auto min-h-10 max-w-full rounded-full px-5 py-2 whitespace-normal',
                })}
              >
                {t('mrp.productionMaterialIssuance.start.warehouseAction')}
              </Link>
            ) : (
              <p className='text-sm leading-6'>
                {t(
                  'mrp.productionMaterialIssuance.start.warehousePermissionHint'
                )}
              </p>
            ))}
          <ProductionMaterialIssuanceSourceBasisDetails
            sources={result.sources}
          />
        </div>
      ) : (
        <>
          <p className='text-xs leading-6 text-muted-foreground'>
            {t('mrp.productionMaterialIssuance.commands.dispatchScope', {
              count: sources.length,
            })}
          </p>
          <label className='flex cursor-pointer items-start gap-2 text-sm leading-6'>
            <input
              type='checkbox'
              className='mt-1 size-4 shrink-0 accent-primary'
              checked={confirmed || prepared}
              disabled={prepared}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            {t('mrp.productionMaterialIssuance.commands.confirmSources')}
          </label>
          <Button
            type='button'
            className='h-auto min-h-9 max-w-full whitespace-normal'
            disabled={pending || (!confirmed && !prepared)}
            onClick={command.dispatchReviewedProductionMaterialIssuanceBasis}
          >
            {t(
              pending
                ? 'mrp.productionMaterialIssuance.commands.submitting'
                : command.current?.status === 'error'
                  ? 'mrp.productionMaterialIssuance.commands.retryOriginal'
                  : 'mrp.productionMaterialIssuance.commands.dispatchAction'
            )}
          </Button>
          {command.current?.error && (
            <ProductionMaterialIssuanceCommandFailureAndStableRetryGuidance
              error={command.current.error}
            />
          )}
        </>
      )}
    </section>
  )
}
