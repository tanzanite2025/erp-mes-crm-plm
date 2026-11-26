import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
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
import {
  productionWorkLocationCatalogQueryKey,
  queryProductionWorkLocationCatalog,
} from '@/features/production-shared/services/production-work-location-catalog-query-service'
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
import { ProductionExecutionProductBarcodeLifecycleHistory } from './components/production-execution-product-barcode-lifecycle-history'
import {
  buildProductionExecutionCommandInput,
  formatProductionExecutionRouteStepName,
  type ProductionExecutionCaptureMode,
} from './form-utils'
import { queryProductionExecutionProductBarcodeLifecycleHistory } from './services/production-execution-product-barcode-lifecycle-history-query-service'

const productionExecutionProductBarcodeLifecycleHistoryQueryKey = (
  actorId: string,
  productBarcode: string
) =>
  [
    'production-execution',
    'product-barcode-lifecycle-history',
    actorId,
    productBarcode,
  ] as const

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
  'h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'

export function ProductionExecutionBarcodeReviewAndExplicitOperationWorkspace() {
  const { t } = useLanguage()
  const { allowsAction, isChecking } = usePermissionActions()
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  const queryClient = useQueryClient()
  const routesQuery = useProductionRoutesQuery()
  const workLocationsQuery = useQuery({
    queryKey: productionWorkLocationCatalogQueryKey,
    queryFn: ({ signal }) => queryProductionWorkLocationCatalog(signal),
  })
  const canExecute = allowsAction('action_production_issuance_execute')
  const [captureMode, setCaptureMode] =
    useState<ProductionExecutionCaptureMode>('manual')
  const [barcode, setBarcode] = useState('')
  const [reviewedBarcode, setReviewedBarcode] = useState('')
  const [action, setAction] = useState<ProductionScanCommandAction>('START')
  const [targetRouteStepId, setTargetRouteStepId] = useState('')
  const [productionWorkLocationId, setProductionWorkLocationId] = useState('')
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
  const lifecycleHistoryBarcode = previewMatchesBarcode
    ? reviewedBarcode
    : normalizedBarcode
      ? ''
      : response?.state.productBarcode || ''
  const lifecycleHistoryQuery = useInfiniteQuery({
    queryKey: productionExecutionProductBarcodeLifecycleHistoryQueryKey(
      actorId,
      lifecycleHistoryBarcode
    ),
    queryFn: ({ pageParam, signal }) =>
      queryProductionExecutionProductBarcodeLifecycleHistory(
        lifecycleHistoryBarcode,
        pageParam,
        signal
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined
      const nextOffset = lastPage.offset + lastPage.limit
      const largestFactCount = Math.max(
        lastPage.stateEventTotal,
        lastPage.operationExecutionTotal,
        lastPage.transferEventTotal
      )
      return nextOffset < largestFactCount ? nextOffset : undefined
    },
    enabled:
      Boolean(actorId) && !isChecking && Boolean(lifecycleHistoryBarcode),
    retry: false,
    staleTime: 0,
  })
  const lifecycleHistoryPages = lifecycleHistoryQuery.data?.pages ?? []
  const lifecycleHistoryInitialReadFailed =
    lifecycleHistoryQuery.isError && !lifecycleHistoryQuery.isFetchNextPageError
  const hasReviewedBarcode =
    previewMatchesBarcode &&
    lifecycleHistoryPages.length > 0 &&
    !lifecycleHistoryQuery.isRefetching &&
    !lifecycleHistoryInitialReadFailed
  const currentState = hasReviewedBarcode
    ? (lifecycleHistoryPages[0]?.currentState ?? null)
    : undefined
  const effectiveRouteId = currentState?.routeId || ''
  const routes = routesQuery.data ?? []
  const selectedRoute = routes.find((route) => route.id === effectiveRouteId)
  const routeSteps = useMemo(
    () =>
      [...(selectedRoute?.steps ?? [])].sort((a, b) => a.sequence - b.sequence),
    [selectedRoute]
  )
  const currentProcessStepMatches = routeSteps.filter(
    (step) => step.processStepId === currentState?.currentProcessStepId
  )
  const selectedStep =
    routeSteps.find((step) => step.id === currentState?.routeStepId) ||
    (currentState?.currentProcessStepId
      ? currentProcessStepMatches.length === 1
        ? currentProcessStepMatches[0]
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
    !workLocationsQuery.isError &&
    (action === 'START' && !currentState?.routeId
      ? true
      : Boolean(selectedRoute && selectedStep)) &&
    Boolean(productionWorkLocationId) &&
    (action === 'START'
      ? (!currentState?.routeId || Boolean(effectiveRouteId)) &&
        currentState?.status !== 'IN_PROGRESS' &&
        currentState?.status !== 'COMPLETED'
      : currentState !== null) &&
    (action !== 'REWORK' || Boolean(targetStep))

  useEffect(() => {
    if (
      previewMatchesBarcode &&
      ((hasReviewedBarcode && currentState !== null) ||
        lifecycleHistoryInitialReadFailed) &&
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
    lifecycleHistoryInitialReadFailed,
  ])

  function resetProductionExecutionProductContextSelectionsAndOptionalDetails() {
    setTargetRouteStepId('')
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
    if (normalized === reviewedBarcode) {
      void queryClient.resetQueries({
        queryKey: productionExecutionProductBarcodeLifecycleHistoryQueryKey(
          actorId,
          normalized
        ),
        exact: true,
      })
    }
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
          productionWorkLocationId,
          targetRouteStepId,
          result,
          notes,
          fromHolderType,
          fromHolderId,
          toHolderType,
          toHolderId,
        })
      )
      setResponse(nextResponse)
      void queryClient.resetQueries({
        queryKey: productionExecutionProductBarcodeLifecycleHistoryQueryKey(
          actorId,
          nextResponse.state.productBarcode
        ),
        exact: true,
      })
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
                  <span className='flex items-center gap-2'>
                    <Icon aria-hidden='true' className='size-4 shrink-0' />
                    {t(`productionExecution.actions.${operationAction}`)}
                  </span>
                  <span className='block text-muted-foreground'>
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
                className='h-auto min-h-9 min-w-0 px-2 py-2 whitespace-normal'
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
                lifecycleHistoryQuery.isFetching
              }
              onClick={() => readProductionExecutionProductBarcodeContext()}
            >
              {lifecycleHistoryQuery.isFetching ? (
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
                    <p className='min-h-9 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground'>
                      {selectedRoute?.name ||
                        (effectiveRouteId
                          ? t('productionExecution.workflow.unknownRoute')
                          : t('productionExecution.workflow.routeFromPlan'))}
                    </p>
                  </ProductionExecutionFormField>
                  <ProductionExecutionFormField
                    label={t('productionExecution.fields.currentStep')}
                  >
                    <p className='min-h-9 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground'>
                      {selectedStep
                        ? formatProductionExecutionRouteStepName(selectedStep)
                        : t('productionExecution.workflow.firstStepFromPlan')}
                    </p>
                  </ProductionExecutionFormField>
                  <ProductionExecutionFormField
                    label={t('productionExecution.fields.workLocation')}
                  >
                    <select
                      value={productionWorkLocationId}
                      onChange={(event) =>
                        setProductionWorkLocationId(event.target.value)
                      }
                      disabled={
                        workLocationsQuery.isLoading ||
                        workLocationsQuery.isError ||
                        isSubmitting
                      }
                      className={productionExecutionSelectClassName}
                    >
                      <option value=''>
                        {t('productionExecution.placeholders.workLocation')}
                      </option>
                      {(workLocationsQuery.data ?? []).map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.code} · {location.name}
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
            loading={
              previewMatchesBarcode &&
              lifecycleHistoryQuery.isFetching &&
              !lifecycleHistoryQuery.isFetchingNextPage
            }
            failed={previewMatchesBarcode && lifecycleHistoryInitialReadFailed}
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
              {action === 'START' && currentState?.status === 'IN_PROGRESS' && (
                <p className='text-xs leading-5 text-amber-800 dark:text-amber-200'>
                  {t('productionExecution.workflow.startAlreadyInProgress')}
                </p>
              )}
              {action === 'START' && currentState?.status === 'COMPLETED' && (
                <p className='text-xs leading-5 text-amber-800 dark:text-amber-200'>
                  {t('productionExecution.workflow.startRequiresRework')}
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
          {lifecycleHistoryBarcode && (
            <ProductionExecutionProductBarcodeLifecycleHistory
              pages={lifecycleHistoryPages}
              routes={routes}
              currentState={lifecycleHistoryPages[0]?.currentState ?? null}
              isLoading={lifecycleHistoryQuery.isLoading}
              isReadFailed={lifecycleHistoryInitialReadFailed}
              isFetchingNextPage={lifecycleHistoryQuery.isFetchingNextPage}
              isNextPageError={lifecycleHistoryQuery.isFetchNextPageError}
              hasNextPage={Boolean(lifecycleHistoryQuery.hasNextPage)}
              onRetry={() => {
                if (lifecycleHistoryQuery.isFetchNextPageError) {
                  void lifecycleHistoryQuery.fetchNextPage()
                  return
                }
                void lifecycleHistoryQuery.refetch()
              }}
              onLoadMore={() => void lifecycleHistoryQuery.fetchNextPage()}
            />
          )}
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
