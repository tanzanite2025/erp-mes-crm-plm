import type { ReactNode, Ref } from 'react'
import { ArrowRight, ScanLine } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type { ProductionRouteStep } from '@/features/production-shared/data/production-route'
import type { ProductionScanCommandAction } from '@/features/scan-platform/contracts/production-scan-command-api-dto'
import { formatProductionExecutionRouteStepName } from '../form-utils'
import type { ProductionExecutionProductBarcodeCurrentProcess } from '../services/production-execution-product-barcode-current-process-query-service'

export function ProductionExecutionCurrentProcessAndSelectedActionPreview({
  action,
  barcode,
  state,
  currentStep,
  nextStep,
  targetStep,
  loading,
  failed,
  reviewed,
  children,
  previewSectionRef,
}: {
  action: ProductionScanCommandAction
  barcode: string
  state?: ProductionExecutionProductBarcodeCurrentProcess | null
  currentStep?: ProductionRouteStep
  nextStep?: ProductionRouteStep
  targetStep?: ProductionRouteStep
  loading: boolean
  failed: boolean
  reviewed: boolean
  children?: ReactNode
  previewSectionRef?: Ref<HTMLElement>
}) {
  const { t } = useLanguage()
  const currentName =
    formatProductionExecutionRouteStepName(currentStep) ||
    state?.currentProcessStep?.name
  const afterAction =
    action === 'COMPLETE'
      ? nextStep
        ? formatProductionExecutionRouteStepName(nextStep)
        : currentStep
          ? t('productionExecution.workflow.routeEnd')
          : t('productionExecution.workflow.nextFromRoute')
      : action === 'REWORK'
        ? formatProductionExecutionRouteStepName(targetStep) ||
          t('productionExecution.workflow.chooseReworkTarget')
        : currentName || t('productionExecution.workflow.chooseCurrentStep')
  return (
    <section
      ref={previewSectionRef}
      aria-labelledby='production-execution-preview-title'
      className='min-w-0 scroll-mt-3 space-y-3 rounded-xl border bg-card p-4'
    >
      <h2
        id='production-execution-preview-title'
        className='text-base font-semibold'
      >
        {t('productionExecution.workflow.previewTitle')}
      </h2>
      {loading ? (
        <p role='status' className='text-sm text-muted-foreground'>
          {t('productionExecution.workflow.reading')}
        </p>
      ) : failed ? (
        <p
          role='alert'
          className='rounded-lg bg-destructive/10 p-3 text-sm text-destructive'
        >
          {t('productionExecution.workflow.readFailed')}
        </p>
      ) : !reviewed ? (
        <div className='space-y-3 rounded-lg bg-muted/30 p-4 text-sm leading-6 text-muted-foreground'>
          <ScanLine aria-hidden='true' className='size-6' />
          <p>{t('productionExecution.workflow.previewEmpty')}</p>
        </div>
      ) : (
        <>
          <div className='min-w-0 space-y-1'>
            <p className='text-sm font-semibold break-all'>{barcode}</p>
            {state?.productName && (
              <p className='text-xs text-muted-foreground'>
                {state.productName}
              </p>
            )}
            <p className='text-xs text-muted-foreground'>
              {state
                ? t(`productionExecution.statuses.${state.status}`)
                : t('productionExecution.workflow.noRecordedState')}
            </p>
          </div>
          <div className='grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2'>
            <div className='min-w-0 rounded-lg bg-muted/40 p-3'>
              <p className='text-xs text-muted-foreground'>
                {t('productionExecution.workflow.beforeAction')}
              </p>
              <p className='mt-1 text-sm font-medium break-words'>
                {currentName ||
                  t('productionExecution.workflow.chooseCurrentStep')}
              </p>
            </div>
            <ArrowRight
              aria-hidden='true'
              className='size-4 text-muted-foreground'
            />
            <div className='min-w-0 rounded-lg bg-primary/5 p-3'>
              <p className='text-xs text-muted-foreground'>
                {t('productionExecution.workflow.afterAction')}
              </p>
              <p className='mt-1 text-sm font-semibold break-words'>
                {afterAction}
              </p>
            </div>
          </div>
          <div className='space-y-1 text-sm leading-6'>
            <p className='text-muted-foreground'>
              {t(`productionExecution.actionDescriptions.${action}`)}
            </p>
          </div>
          {state === null && (
            <p className='rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100'>
              {t('productionExecution.workflow.firstStart')}
            </p>
          )}
        </>
      )}
      {children}
    </section>
  )
}
