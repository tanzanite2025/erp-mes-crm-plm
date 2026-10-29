import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Camera,
  CheckCircle2,
  CirclePause,
  Keyboard,
  Loader2,
  PlayCircle,
  RotateCcw,
  ScanLine,
  Usb,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { normalizeMachineCode } from '@/lib/codecs/code-normalization'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CameraScanInput } from '@/components/camera-scan-input'
import { ForbiddenState } from '@/components/forbidden-state'
import { HIDScanInput } from '@/components/hid-scan-input'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { useProductionRoutesQuery } from '@/features/production-shared/hooks/use-production-resources'
import type {
  ProductionScanCommandAction,
  ProductionScanCommandApiResponseDTO,
} from '@/features/scan-platform/contracts/production-scan-command-api-dto'
import {
  classifyProductionScanCommandError,
  productionScanCommandService,
} from '@/features/scan-platform/services/production-scan-command-service'
import { ProductionExecutionConfirmedOperationResultAndRouteProgress } from './components/production-execution-confirmed-operation-result-and-route-progress'
import { ProductionExecutionCurrentProcessAndSelectedActionPreview } from './components/production-execution-current-process-and-selected-action-preview'
import {
  buildProductionExecutionCommandInput,
  formatProductionExecutionRouteStepName,
  type ProductionExecutionCaptureMode,
} from './form-utils'
import { queryProductionExecutionProductBarcodeCurrentProcess } from './services/production-execution-product-barcode-current-process-query-service'

const productionExecutionActionIcons = {
  START: PlayCircle,
  COMPLETE: CheckCircle2,
  HOLD: CirclePause,
  REWORK: RotateCcw,
}
const productionExecutionCaptureModes = [
  { value: 'manual', icon: Keyboard },
  { value: 'camera', icon: Camera },
  { value: 'usb', icon: Usb },
] as const
const productionExecutionSelectClassName =
  'h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'

export function ProductionExecutionBarcodeReviewAndExplicitOperationWorkspace() {
  const { t } = useLanguage()
  const { allowsAction, isChecking } = usePermissionActions()
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  const routesQuery = useProductionRoutesQuery()
  const canExecute = allowsAction('action_production_issuance_execute')
  const [captureMode, setCaptureMode] =
    useState<ProductionExecutionCaptureMode>('manual')
  const [barcode, setBarcode] = useState('')
  const [reviewedBarcode, setReviewedBarcode] = useState('')
  const [action, setAction] = useState<ProductionScanCommandAction>('START')
  const [routeId, setRouteId] = useState('')
  const [routeStepId, setRouteStepId] = useState('')
  const [targetRouteStepId, setTargetRouteStepId] = useState('')
  const [executionLotId, setExecutionLotId] = useState('')
  const [result, setResult] = useState('')
  const [notes, setNotes] = useState('')
  const [fromHolderType, setFromHolderType] = useState('')
  const [fromHolderId, setFromHolderId] = useState('')
  const [toHolderType, setToHolderType] = useState('')
  const [toHolderId, setToHolderId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [response, setResponse] =
    useState<ProductionScanCommandApiResponseDTO | null>(null)
  const [commandError, setCommandError] = useState<ReturnType<
    typeof classifyProductionScanCommandError
  > | null>(null)
  const productionExecutionReviewSectionRef = useRef<HTMLElement>(null)

  const normalizedBarcode = normalizeMachineCode(barcode)
  const previewMatchesBarcode = Boolean(
    reviewedBarcode && reviewedBarcode === normalizedBarcode
  )
  const barcodeStateQuery = useQuery({
    queryKey: [
      'production-execution',
      'product-barcode-current-process',
      actorId,
      reviewedBarcode,
    ],
    queryFn: ({ signal }) =>
      queryProductionExecutionProductBarcodeCurrentProcess(
        reviewedBarcode,
        signal
      ),
    enabled: Boolean(actorId) && !isChecking && previewMatchesBarcode,
    retry: false,
    staleTime: 0,
  })
  const hasReviewedBarcode =
    previewMatchesBarcode &&
    barcodeStateQuery.isSuccess &&
    !barcodeStateQuery.isFetching
  const currentState = hasReviewedBarcode ? barcodeStateQuery.data : undefined
  const effectiveRouteId = currentState?.routeId || routeId
  const routes = routesQuery.data ?? []
  const selectedRoute = routes.find((route) => route.id === effectiveRouteId)
  const routeSteps = useMemo(
    () =>
      [...(selectedRoute?.steps ?? [])].sort((a, b) => a.sequence - b.sequence),
    [selectedRoute]
  )
  const currentProcessMatches = routeSteps.filter(
    (step) => step.processStepId === currentState?.currentProcessStepId
  )
  const selectedStep =
    routeSteps.find(
      (step) => step.id === (currentState?.routeStepId || routeStepId)
    ) ||
    (currentState?.currentProcessStepId
      ? currentProcessMatches.length === 1
        ? currentProcessMatches[0]
        : undefined
      : action === 'START'
        ? routeSteps[0]
        : undefined)
  const nextStep = selectedStep
    ? routeSteps.find((step) => step.sequence > selectedStep.sequence)
    : undefined
  const targetStep = routeSteps.find((step) => step.id === targetRouteStepId)
  const hasCustodyTransfer = Boolean(
    fromHolderType || fromHolderId || toHolderType || toHolderId
  )
  const canSubmit =
    canExecute &&
    !isChecking &&
    !isSubmitting &&
    hasReviewedBarcode &&
    !routesQuery.isError &&
    Boolean(selectedRoute && selectedStep) &&
    (action === 'START' ? Boolean(effectiveRouteId) : currentState !== null) &&
    (action !== 'REWORK' || Boolean(targetStep))

  useEffect(() => {
    if (
      previewMatchesBarcode &&
      ((hasReviewedBarcode && currentState !== null) ||
        barcodeStateQuery.isError) &&
      window.matchMedia?.('(max-width: 1279px)').matches
    ) {
      productionExecutionReviewSectionRef.current?.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      })
    }
  }, [
    previewMatchesBarcode,
    hasReviewedBarcode,
    currentState,
    barcodeStateQuery.isError,
  ])

  function resetProductionExecutionProductContextSelectionsAndOptionalDetails() {
    setRouteId('')
    setRouteStepId('')
    setTargetRouteStepId('')
    setExecutionLotId('')
    setResult('')
    setNotes('')
    setFromHolderType('')
    setFromHolderId('')
    setToHolderType('')
    setToHolderId('')
  }

  function readProductionExecutionProductBarcodeContext(code = barcode) {
    const normalized = normalizeMachineCode(code)
    if (!normalized || isSubmitting) return
    setBarcode(normalized)
    setCommandError(null)
    if (normalized !== reviewedBarcode) {
      resetProductionExecutionProductContextSelectionsAndOptionalDetails()
    }
    setReviewedBarcode(normalized)
    if (normalized === reviewedBarcode) void barcodeStateQuery.refetch()
  }

  async function submitReviewedProductionExecutionOperation() {
    if (!canSubmit) return
    setIsSubmitting(true)
    setCommandError(null)
    try {
      const nextResponse = await productionScanCommandService.execute(
        buildProductionExecutionCommandInput({
          productBarcode: normalizedBarcode,
          captureMode,
          action,
          executionLotId,
          routeId: effectiveRouteId,
          routeStepId: currentState?.routeStepId || selectedStep?.id || '',
          processStepId:
            currentState?.currentProcessStepId ||
            selectedStep?.processStepId ||
            '',
          targetRouteStepId,
          targetProcessStepId: targetStep?.processStepId || '',
          result,
          notes,
          fromHolderType,
          fromHolderId,
          toHolderType,
          toHolderId,
        })
      )
      setResponse(nextResponse)
      setBarcode('')
      setReviewedBarcode('')
      resetProductionExecutionProductContextSelectionsAndOptionalDetails()
      toast.success(t('productionExecution.toasts.executed'))
    } catch (error) {
      setCommandError(classifyProductionScanCommandError(error))
      toast.error(t('productionExecution.toasts.failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isForbiddenError(routesQuery.error)) return <ForbiddenState />

  return (
    <div className='@container min-w-0 space-y-3 pb-4 sm:space-y-4'>
      <header className='space-y-1'>
        <h1 className='flex items-center gap-2 text-xl font-semibold'>
          <Activity aria-hidden='true' className='size-5 text-primary' />
          {t('productionExecution.page.title')}
        </h1>
        <p className='text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6'>
          {t('productionExecution.page.description')}
        </p>
      </header>
      <section
        aria-labelledby='production-execution-action-title'
        className='space-y-2'
      >
        <h2
          id='production-execution-action-title'
          className='text-sm font-semibold'
        >
          {t('productionExecution.workflow.chooseAction')}
        </h2>
        <div
          role='group'
          aria-label={t('productionExecution.fields.action')}
          className='grid grid-cols-2 gap-2 xl:grid-cols-4'
        >
          {(['START', 'COMPLETE', 'HOLD', 'REWORK'] as const).map(
            (operationAction) => {
              const Icon = productionExecutionActionIcons[operationAction]
              return (
                <button
                  key={operationAction}
                  type='button'
                  aria-pressed={action === operationAction}
                  disabled={isSubmitting}
                  onClick={() => setAction(operationAction)}
                  className={cn(
                    'min-w-0 space-y-1 rounded-xl border bg-card p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:space-y-2 sm:p-3',
                    action === operationAction
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'hover:bg-muted/30'
                  )}
                >
                  <span className='flex items-center gap-2 text-sm font-semibold'>
                    <Icon aria-hidden='true' className='size-4 shrink-0' />
                    {t(`productionExecution.actions.${operationAction}`)}
                  </span>
                  <span className='block text-xs leading-4 text-muted-foreground sm:leading-5'>
                    {t(
                      `productionExecution.actionSummaries.${operationAction}`
                    )}
                  </span>
                </button>
              )
            }
          )}
        </div>
        <details className='text-xs leading-5 text-muted-foreground'>
          <summary className='w-fit cursor-pointer'>
            {t('productionExecution.workflow.scopeTitle')}
          </summary>
          <p className='mt-2'>
            {t('productionExecution.workflow.scopeDescription')}
          </p>
        </details>
      </section>

      <div className='grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]'>
        <section
          aria-labelledby='production-execution-form-title'
          className='min-w-0 space-y-3 rounded-xl border bg-card p-3 sm:space-y-4 sm:p-4'
        >
          <h2
            id='production-execution-form-title'
            className='text-base font-semibold'
          >
            {t('productionExecution.workflow.scanProduct')}
          </h2>
          <div
            role='group'
            aria-label={t('productionExecution.fields.captureMode')}
            className='grid grid-cols-3 gap-2'
          >
            {productionExecutionCaptureModes.map(({ value, icon: Icon }) => (
              <Button
                key={value}
                type='button'
                variant={captureMode === value ? 'secondary' : 'outline'}
                aria-pressed={captureMode === value}
                disabled={isSubmitting}
                onClick={() => setCaptureMode(value)}
                className='h-auto min-h-9 min-w-0 px-2 py-2 text-xs whitespace-normal'
              >
                <Icon aria-hidden='true' className='size-3.5 shrink-0' />
                {t(`productionExecution.capture.${value}`)}
              </Button>
            ))}
          </div>
          <ProductionExecutionFormField
            label={t('productionExecution.fields.productBarcode')}
          >
            {captureMode === 'usb' ? (
              <HIDScanInput
                value={barcode}
                onValueChange={setBarcode}
                onScanComplete={readProductionExecutionProductBarcodeContext}
                placeholder={t(
                  'productionExecution.placeholders.productBarcode'
                )}
                disabled={isSubmitting}
                showManualComplete={false}
                inputClassName='h-11 rounded-lg'
              />
            ) : captureMode === 'camera' ? (
              <CameraScanInput
                value={barcode}
                onValueChange={setBarcode}
                onScanComplete={readProductionExecutionProductBarcodeContext}
                placeholder={t(
                  'productionExecution.placeholders.productBarcode'
                )}
                disabled={isSubmitting}
                inputClassName='h-11 rounded-lg'
              />
            ) : (
              <Input
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    readProductionExecutionProductBarcodeContext()
                  }
                }}
                placeholder={t(
                  'productionExecution.placeholders.productBarcode'
                )}
                disabled={isSubmitting}
                className='h-11'
              />
            )}
          </ProductionExecutionFormField>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={
                !normalizedBarcode ||
                isSubmitting ||
                barcodeStateQuery.isFetching
              }
              onClick={() => readProductionExecutionProductBarcodeContext()}
            >
              {barcodeStateQuery.isFetching ? (
                <Loader2 aria-hidden='true' className='size-4 animate-spin' />
              ) : (
                <ScanLine aria-hidden='true' className='size-4' />
              )}
              {t('productionExecution.workflow.readBarcode')}
            </Button>
            <p className='text-xs leading-5 text-muted-foreground'>
              {t('productionExecution.workflow.scanHint')}
            </p>
          </div>

          {hasReviewedBarcode && (
            <div className='space-y-4 border-t pt-4'>
              {routesQuery.isError && (
                <p role='alert' className='text-sm text-destructive'>
                  {t('productionExecution.workflow.routesFailed')}
                </p>
              )}
              <details open={currentState === null} className='text-xs'>
                <summary className='cursor-pointer font-medium text-muted-foreground'>
                  {t('productionExecution.workflow.reviewContext')}
                  {currentState && selectedRoute && (
                    <span className='ml-2'>{selectedRoute.name}</span>
                  )}
                </summary>
                <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                  <ProductionExecutionFormField
                    label={t('productionExecution.fields.route')}
                  >
                    <select
                      value={effectiveRouteId}
                      onChange={(event) => {
                        setRouteId(event.target.value)
                        setRouteStepId('')
                        setTargetRouteStepId('')
                      }}
                      disabled={
                        Boolean(currentState?.routeId) ||
                        routesQuery.isLoading ||
                        isSubmitting
                      }
                      className={productionExecutionSelectClassName}
                    >
                      <option value=''>
                        {t('productionExecution.placeholders.route')}
                      </option>
                      {routes
                        .filter(
                          (route) =>
                            route.status !== 'ARCHIVED' ||
                            route.id === effectiveRouteId
                        )
                        .map((route) => (
                          <option key={route.id} value={route.id}>
                            {route.code} · {route.name}
                          </option>
                        ))}
                      {effectiveRouteId && !selectedRoute && (
                        <option value={effectiveRouteId}>
                          {t('productionExecution.workflow.unknownRoute')}
                        </option>
                      )}
                    </select>
                  </ProductionExecutionFormField>
                  <ProductionExecutionFormField
                    label={t('productionExecution.fields.currentStep')}
                  >
                    <select
                      value={selectedStep?.id || ''}
                      onChange={(event) => setRouteStepId(event.target.value)}
                      disabled={
                        Boolean(currentState?.currentProcessStepId) ||
                        !selectedRoute ||
                        isSubmitting
                      }
                      className={productionExecutionSelectClassName}
                    >
                      <option value=''>
                        {currentState?.currentProcessStep?.name ||
                          t('productionExecution.placeholders.currentStep')}
                      </option>
                      {routeSteps.map((step) => (
                        <option key={step.id} value={step.id}>
                          {formatProductionExecutionRouteStepName(step)}
                        </option>
                      ))}
                    </select>
                  </ProductionExecutionFormField>
                </div>
                {currentState && (
                  <p className='text-xs leading-5 text-muted-foreground'>
                    {t('productionExecution.workflow.recordedContextHint')}
                  </p>
                )}
              </details>
              {action === 'REWORK' && (
                <ProductionExecutionFormField
                  label={t('productionExecution.fields.reworkTarget')}
                >
                  <select
                    value={targetRouteStepId}
                    onChange={(event) =>
                      setTargetRouteStepId(event.target.value)
                    }
                    disabled={!selectedRoute || isSubmitting}
                    className={productionExecutionSelectClassName}
                  >
                    <option value=''>
                      {t('productionExecution.placeholders.reworkTarget')}
                    </option>
                    {routeSteps.map((step) => (
                      <option key={step.id} value={step.id}>
                        {formatProductionExecutionRouteStepName(step)}
                      </option>
                    ))}
                  </select>
                </ProductionExecutionFormField>
              )}
              <details className='rounded-lg border p-3 text-xs'>
                <summary className='cursor-pointer font-medium text-muted-foreground'>
                  {t('productionExecution.workflow.optionalDetails')}
                </summary>
                <div className='mt-3 space-y-3'>
                  <ProductionExecutionFormField
                    label={t('productionExecution.fields.executionLot')}
                  >
                    <Input
                      value={executionLotId}
                      onChange={(event) =>
                        setExecutionLotId(event.target.value)
                      }
                      disabled={isSubmitting}
                      placeholder={t(
                        'productionExecution.placeholders.executionLot'
                      )}
                    />
                  </ProductionExecutionFormField>
                  <ProductionExecutionFormField
                    label={t('productionExecution.fields.result')}
                  >
                    <Input
                      value={result}
                      onChange={(event) => setResult(event.target.value)}
                      disabled={isSubmitting}
                      placeholder={t('productionExecution.placeholders.result')}
                    />
                  </ProductionExecutionFormField>
                  <ProductionExecutionFormField
                    label={t('productionExecution.fields.notes')}
                  >
                    <Textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      disabled={isSubmitting}
                      placeholder={t('productionExecution.placeholders.notes')}
                    />
                  </ProductionExecutionFormField>
                </div>
              </details>
              <details className='rounded-lg border p-3 text-xs'>
                <summary className='cursor-pointer font-medium text-muted-foreground'>
                  {t('productionExecution.advanced.title')}
                </summary>
                <p className='mt-3 leading-5 text-muted-foreground'>
                  {t('productionExecution.workflow.custodyHint')}
                </p>
                <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                  <ProductionExecutionFormField
                    label={t('productionExecution.fields.fromHolderType')}
                  >
                    <Input
                      value={fromHolderType}
                      onChange={(event) =>
                        setFromHolderType(event.target.value)
                      }
                      disabled={isSubmitting}
                      placeholder={t(
                        'productionExecution.placeholders.holderType'
                      )}
                    />
                  </ProductionExecutionFormField>
                  <ProductionExecutionFormField
                    label={t('productionExecution.fields.fromHolderId')}
                  >
                    <Input
                      value={fromHolderId}
                      onChange={(event) => setFromHolderId(event.target.value)}
                      disabled={isSubmitting}
                      placeholder={t(
                        'productionExecution.placeholders.holderId'
                      )}
                    />
                  </ProductionExecutionFormField>
                  <ProductionExecutionFormField
                    label={t('productionExecution.fields.toHolderType')}
                  >
                    <Input
                      value={toHolderType}
                      onChange={(event) => setToHolderType(event.target.value)}
                      disabled={isSubmitting}
                      placeholder={t(
                        'productionExecution.placeholders.holderType'
                      )}
                    />
                  </ProductionExecutionFormField>
                  <ProductionExecutionFormField
                    label={t('productionExecution.fields.toHolderId')}
                  >
                    <Input
                      value={toHolderId}
                      onChange={(event) => setToHolderId(event.target.value)}
                      disabled={isSubmitting}
                      placeholder={t(
                        'productionExecution.placeholders.holderId'
                      )}
                    />
                  </ProductionExecutionFormField>
                </div>
              </details>
            </div>
          )}
        </section>
        <aside className='min-w-0 space-y-4 xl:sticky xl:top-0'>
          <ProductionExecutionCurrentProcessAndSelectedActionPreview
            previewSectionRef={productionExecutionReviewSectionRef}
            action={action}
            barcode={normalizedBarcode}
            state={currentState}
            currentStep={selectedStep}
            nextStep={nextStep}
            targetStep={targetStep}
            loading={previewMatchesBarcode && barcodeStateQuery.isFetching}
            failed={previewMatchesBarcode && barcodeStateQuery.isError}
            reviewed={hasReviewedBarcode}
          >
            <div className='space-y-2 border-t pt-3'>
              {hasCustodyTransfer && (
                <p className='text-xs leading-5 text-amber-800 dark:text-amber-200'>
                  {t('productionExecution.workflow.custodyAdded')}
                </p>
              )}
              {!canExecute && !isChecking && (
                <p className='text-xs text-muted-foreground'>
                  {t('productionExecution.noExecutePermission')}
                </p>
              )}
              <Button
                type='button'
                disabled={!canSubmit}
                onClick={() =>
                  void submitReviewedProductionExecutionOperation()
                }
                className='h-auto min-h-10 w-full py-2 whitespace-normal'
              >
                {isSubmitting && (
                  <Loader2 aria-hidden='true' className='size-4 animate-spin' />
                )}
                {t(`productionExecution.confirmActions.${action}`)}
              </Button>
              {!hasReviewedBarcode && (
                <p className='text-xs leading-5 text-muted-foreground'>
                  {t('productionExecution.workflow.reviewBeforeSubmit')}
                </p>
              )}
            </div>
          </ProductionExecutionCurrentProcessAndSelectedActionPreview>
          <ProductionExecutionConfirmedOperationResultAndRouteProgress
            response={response}
            commandError={commandError}
            routes={routes}
          />
        </aside>
      </div>
    </div>
  )
}

function ProductionExecutionFormField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className='grid min-w-0 gap-1.5'>
      <span className='text-xs font-medium text-muted-foreground'>{label}</span>
      {children}
    </label>
  )
}
