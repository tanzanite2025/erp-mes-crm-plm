import { isApiClientError } from '@/lib/api-error'
import { useLanguage } from '@/context/language-provider'

export function ProductionMaterialIssuanceCommandFailureAndStableRetryGuidance({
  error,
}: {
  error: Error
}) {
  const { t } = useLanguage()
  const wasRejected =
    isApiClientError(error) &&
    error.kind === 'http' &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500
  return (
    <div
      role='alert'
      className='space-y-1 rounded-xl bg-destructive/10 p-3 text-sm text-destructive'
    >
      <p>
        {t(
          wasRejected
            ? 'mrp.productionMaterialIssuance.commands.rejected'
            : 'mrp.productionMaterialIssuance.commands.unknownOutcome'
        )}
      </p>
      <p className='wrap-anywhere'>{error.message}</p>
    </div>
  )
}
