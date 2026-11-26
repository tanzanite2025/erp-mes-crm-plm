import type { TranslationKey } from '@/locales'
import { CheckCircle2, ScanLine } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type { ProductionRoute } from '@/features/production-shared/data/production-route'
import type { ProductionScanCommandApiResponseDTO } from '@/features/scan-platform/contracts/production-scan-command-api-dto'
import type { classifyProductionScanCommandError } from '@/features/scan-platform/services/production-scan-command-service'
import { formatProductionExecutionRouteStepName } from '../form-utils'

const productionExecutionRecordedActionLabels: Record<string, TranslationKey> =
  {
    START: 'productionExecution.actions.START',
    COMPLETE: 'productionExecution.actions.COMPLETE',
    HOLD: 'productionExecution.actions.HOLD',
    REWORK: 'productionExecution.actions.REWORK',
  }
const productionExecutionRecordedStatusLabels: Record<string, TranslationKey> =
  {
    NOT_STARTED: 'productionExecution.statuses.NOT_STARTED',
    IN_PROGRESS: 'productionExecution.statuses.IN_PROGRESS',
    COMPLETED: 'productionExecution.statuses.COMPLETED',
    HOLD: 'productionExecution.statuses.HOLD',
    REWORK: 'productionExecution.statuses.REWORK',
  }

function resolveProductionExecutionRecordedRouteStepName(
  routes: ProductionRoute[],
  routeId: string,
  routeStepId: string,
  processStepId: string
) {
  const steps = routes.find((route) => route.id === routeId)?.steps ?? []
  const step = steps.find((item) => item.id === routeStepId)
  if (step) return formatProductionExecutionRouteStepName(step)
  const matches = steps.filter((item) => item.processStepId === processStepId)
  return matches.length === 1
    ? formatProductionExecutionRouteStepName(matches[0])
    : ''
}

export function ProductionExecutionConfirmedOperationResultAndRouteProgress({
  response,
  commandError,
  routes,
}: {
  response: ProductionScanCommandApiResponseDTO | null
  commandError: ReturnType<typeof classifyProductionScanCommandError> | null
  routes: ProductionRoute[]
}) {
  const { t } = useLanguage()
  const executedStep =
    response &&
    resolveProductionExecutionRecordedRouteStepName(
      routes,
      response.operation.routeId,
      response.progress.executedRouteStepId,
      response.progress.executedProcessStepId
    )
  const currentStep =
    response &&
    (resolveProductionExecutionRecordedRouteStepName(
      routes,
      response.state.routeId,
      response.state.routeStepId,
      response.state.currentProcessStepId
    ) ||
      response.state.currentProcessStep?.name)
  return (
    <section
      aria-labelledby='production-execution-result-title'
      className='min-w-0 space-y-3 rounded-xl border bg-card p-4'
    >
      <h2
        id='production-execution-result-title'
        className='text-base font-semibold'
      >
        {t('productionExecution.result.title')}
      </h2>
      {commandError && (
        <div
          role='alert'
          className='space-y-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive'
        >
          <p className='font-medium'>
            {t('productionExecution.result.failed')}
          </p>
          <p>{commandError.message}</p>
        </div>
      )}
      {!response ? (
        <div className='space-y-2 py-4 text-sm leading-6 text-muted-foreground'>
          <ScanLine aria-hidden='true' className='size-6' />
          <p>{t('productionExecution.result.empty')}</p>
        </div>
      ) : (
        <>
          <div className='space-y-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30'>
            <p className='flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200'>
              <CheckCircle2 aria-hidden='true' className='size-4 shrink-0' />
              {t(
                response.progress.routeCompleted
                  ? 'productionExecution.workflow.confirmedRouteEnd'
                  : response.progress.advanced
                    ? response.operation.action === 'REWORK'
                      ? 'productionExecution.workflow.confirmedRework'
                      : 'productionExecution.workflow.confirmedAdvance'
                    : 'productionExecution.workflow.confirmedOperation'
              )}
            </p>
            <p className='text-sm font-medium break-all'>
              {response.state.productBarcode}
            </p>
          </div>
          <dl className='grid min-w-0 grid-cols-2 gap-3 text-sm'>
            <ProductionExecutionRecordedResultValue
              label={t('productionExecution.result.operation')}
              value={t(
                productionExecutionRecordedActionLabels[
                  response.operation.action
                ] ?? 'productionExecution.workflow.unknownStatus'
              )}
            />
            <ProductionExecutionRecordedResultValue
              label={t('productionExecution.result.barcodeState')}
              value={t(
                productionExecutionRecordedStatusLabels[
                  response.state.status
                ] ?? 'productionExecution.workflow.unknownStatus'
              )}
            />
            <ProductionExecutionRecordedResultValue
              label={t('productionExecution.result.executedStep')}
              value={
                executedStep || t('productionExecution.workflow.unknownProcess')
              }
            />
            <ProductionExecutionRecordedResultValue
              label={t('productionExecution.result.currentProcess')}
              value={
                response.progress.routeCompleted
                  ? t('productionExecution.workflow.routeEnd')
                  : currentStep ||
                    t('productionExecution.workflow.unknownProcess')
              }
            />
            <ProductionExecutionRecordedResultValue
              label={t('productionExecution.result.route')}
              value={
                routes.find((route) => route.id === response.state.routeId)
                  ?.name || t('productionExecution.workflow.unknownRoute')
              }
            />
            <ProductionExecutionRecordedResultValue
              label={t('productionExecution.fields.submittedBy')}
              value={response.operation.operator || '—'}
            />
          </dl>
          {response.progress.advanced &&
            response.operation.action === 'COMPLETE' && (
              <p className='text-xs leading-5 text-muted-foreground'>
                {t('productionExecution.workflow.nextNeedsStart')}
              </p>
            )}
          {response.transferEvents.length > 0 && (
            <div className='space-y-2 border-t pt-3'>
              <h3 className='text-sm font-medium'>
                {t('productionExecution.result.transferEvents')}
              </h3>
              {response.transferEvents.map((event) => (
                <div
                  key={event.id}
                  className='space-y-1 rounded-lg bg-muted/30 p-3 text-xs leading-5'
                >
                  <p className='font-medium'>
                    {t(
                      event.transferType === 'ROUTE_ADVANCE'
                        ? response.operation.action === 'REWORK'
                          ? 'productionExecution.workflow.reworkTransferEvent'
                          : 'productionExecution.workflow.routeAdvanceEvent'
                        : 'productionExecution.workflow.custodyTransferEvent'
                    )}
                  </p>
                  {event.transferType === 'ROUTE_ADVANCE' ? (
                    <p>
                      {resolveProductionExecutionRecordedRouteStepName(
                        routes,
                        event.routeId,
                        event.fromRouteStepId,
                        event.fromProcessStepId
                      ) || t('productionExecution.workflow.unknownProcess')}
                      {' → '}
                      {resolveProductionExecutionRecordedRouteStepName(
                        routes,
                        event.routeId,
                        event.toRouteStepId,
                        event.toProcessStepId
                      ) || t('productionExecution.workflow.unknownProcess')}
                    </p>
                  ) : (
                    <p>{t('productionExecution.workflow.custodyRecorded')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function ProductionExecutionRecordedResultValue({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className='min-w-0 space-y-1'>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='font-medium break-words'>{value}</dd>
    </div>
  )
}
