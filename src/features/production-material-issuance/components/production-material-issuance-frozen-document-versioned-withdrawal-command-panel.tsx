import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { productionMaterialIssuanceWithdrawalCommandSchema } from '../contracts/production-material-issuance-reviewed-dispatch-and-versioned-withdrawal-command-api-dto'
import type { ProductionMaterialIssuanceDocument } from '../contracts/production-material-issuance-source-review-and-frozen-document-api-dto'
import { useProductionMaterialIssuanceVersionedWithdrawal } from '../hooks/use-production-material-issuance-explicit-dispatch-withdrawal-and-stable-request-retry'
import { ProductionMaterialIssuanceCommandFailureAndStableRetryGuidance } from './production-material-issuance-command-failure-and-stable-retry-guidance'

export function ProductionMaterialIssuanceFrozenDocumentVersionedWithdrawalCommandPanel({
  document,
}: {
  document: ProductionMaterialIssuanceDocument
}) {
  const { allowsAction } = usePermissionActions()
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  if (
    !actorId ||
    document.status !== 'DISPATCHED' ||
    document.warehouseExecutionAt ||
    !allowsAction('action_production_material_issuance_view') ||
    !allowsAction('action_production_material_issuance_withdraw')
  )
    return null
  return (
    <AuthorizedProductionMaterialIssuanceFrozenDocumentWithdrawalCommandPanel
      key={`${actorId}/${document.id}/${document.version}`}
      document={document}
    />
  )
}

function AuthorizedProductionMaterialIssuanceFrozenDocumentWithdrawalCommandPanel({
  document,
}: {
  document: ProductionMaterialIssuanceDocument
}) {
  const { t } = useLanguage()
  const command = useProductionMaterialIssuanceVersionedWithdrawal(
    document.id,
    document.version
  )
  const [isEditing, setIsEditing] = useState(false)
  const [reason, setReason] = useState('')
  const pending = command.current?.status === 'pending'
  const prepared = command.current?.request
  if (!isEditing && !command.current)
    return (
      <Button
        type='button'
        variant='outline'
        onClick={() => setIsEditing(true)}
      >
        {t('mrp.productionMaterialIssuance.commands.withdrawTitle')}
      </Button>
    )
  return (
    <section
      aria-label={t('mrp.productionMaterialIssuance.commands.withdrawTitle')}
      className='min-w-0 space-y-3 rounded-xl border border-dashed p-3'
    >
      <h4 className='text-sm font-semibold'>
        {t('mrp.productionMaterialIssuance.commands.withdrawTitle')}
      </h4>
      <p className='text-xs leading-6 text-muted-foreground'>
        {t('mrp.productionMaterialIssuance.commands.withdrawHint')}
      </p>
      {command.current?.data ? (
        <p role='status' className='text-sm'>
          {t('mrp.productionMaterialIssuance.commands.withdrawn')}
        </p>
      ) : (
        <>
          <label className='block space-y-2 text-sm'>
            <span>{t('mrp.productionMaterialIssuance.commands.reason')}</span>
            <textarea
              className='min-h-20 w-full rounded-md border bg-background p-2'
              value={prepared?.reason ?? reason}
              disabled={Boolean(prepared)}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          {reason.trim() &&
            !productionMaterialIssuanceWithdrawalCommandSchema.shape.reason.safeParse(
              reason
            ).success && (
              <p role='alert' className='text-sm text-destructive'>
                {t('mrp.productionMaterialIssuance.commands.reasonTooLong')}
              </p>
            )}
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='destructive'
              className='h-auto min-h-9 max-w-full whitespace-normal'
              disabled={
                pending ||
                !productionMaterialIssuanceWithdrawalCommandSchema.shape.reason.safeParse(
                  prepared?.reason ?? reason
                ).success
              }
              onClick={() =>
                command.withdrawProductionMaterialIssuanceDocument(reason)
              }
            >
              {t(
                pending
                  ? 'mrp.productionMaterialIssuance.commands.submitting'
                  : command.current?.status === 'error'
                    ? 'mrp.productionMaterialIssuance.commands.retryOriginal'
                    : 'mrp.productionMaterialIssuance.commands.withdrawAction'
              )}
            </Button>
            {!prepared && (
              <Button
                type='button'
                variant='outline'
                onClick={() => setIsEditing(false)}
              >
                {t('mrp.productionMaterialIssuance.commands.cancel')}
              </Button>
            )}
          </div>
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
