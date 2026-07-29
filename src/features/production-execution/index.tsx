import { useEffect, useMemo, useState } from 'react'
import type { TranslationKey } from '@/locales'
import {
  Activity,
  ArrowRight,
  Camera,
  CheckCircle2,
  CirclePause,
  Clock3,
  Cpu,
  Loader2,
  PlayCircle,
  RotateCcw,
  ScanLine,
  Usb,
} from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CameraScanInput } from '@/components/camera-scan-input'
import { ForbiddenState } from '@/components/forbidden-state'
import { HIDScanInput } from '@/components/hid-scan-input'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import {
  industrialPanelClassName,
  industrialPanelGradientClassName,
} from '@/components/uds/industrial-panel'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { useOutsourcePartners } from '@/features/production-outsourcing/hooks/use-outsource-partners'
import type { ProductionRouteStep } from '@/features/production-shared/data/production-route'
import { useProductionRoutesQuery } from '@/features/production-shared/hooks/use-production-resources'
import type {
  ProductionScanCommandAction,
  ProductionScanCommandApiResponseDTO,
} from '@/features/scan-platform/contracts/production-scan-command-api-dto'
import {
  classifyProductionScanCommandError,
  productionScanCommandService,
} from '@/features/scan-platform/services/production-scan-command-service'
import {
  buildProductionExecutionCommandInput,
  type ProductionExecutionCaptureMode,
  type ProductionExecutionFormValues,
} from './form-utils'

const actionIcons: Record<ProductionScanCommandAction, typeof PlayCircle> = {
  START: PlayCircle,
  COMPLETE: CheckCircle2,
  HOLD: CirclePause,
  REWORK: RotateCcw,
}

const actionKeys: Record<ProductionScanCommandAction, TranslationKey> = {
  START: 'productionExecution.actions.START',
  COMPLETE: 'productionExecution.actions.COMPLETE',
  HOLD: 'productionExecution.actions.HOLD',
  REWORK: 'productionExecution.actions.REWORK',
}

const captureModes: Array<{
  value: ProductionExecutionCaptureMode
  icon: typeof Camera
  labelKey: TranslationKey
}> = [
  {
    value: 'manual',
    icon: Cpu,
    labelKey: 'productionExecution.capture.manual',
  },
  {
    value: 'camera',
    icon: Camera,
    labelKey: 'productionExecution.capture.camera',
  },
  {
    value: 'usb',
    icon: Usb,
    labelKey: 'productionExecution.capture.usb',
  },
]

const selectClass =
  'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30'
const fieldLabelClass = 'text-xs font-bold text-muted-foreground'

function displayValue(value: string | number | undefined | null) {
  const normalized = String(value ?? '').trim()
  return normalized || '—'
}

function routeStepLabel(step: ProductionRouteStep) {
  const process = [step.processCode, step.processName]
    .filter(Boolean)
    .join(' · ')
  const segment = step.segmentName || step.segmentId
  return `${step.sequence}. ${segment ? `${segment} / ` : ''}${process || step.processStepId}`
}

function statusTone(status: string) {
  const normalized = status.toUpperCase()
  if (normalized.includes('COMPLETE') || normalized === 'COMPLETED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
  }
  if (normalized.includes('HOLD')) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-600'
  }
  if (normalized.includes('REWORK')) {
    return 'border-violet-500/30 bg-violet-500/10 text-violet-600'
  }
  if (normalized.includes('FAIL') || normalized.includes('ERROR')) {
    return 'border-rose-500/30 bg-rose-500/10 text-rose-600'
  }
  return 'border-sky-500/30 bg-sky-500/10 text-sky-600'
}

function sourceLabelKey(source: string): TranslationKey {
  return `productionExecution.sources.${source.toUpperCase()}` as TranslationKey
}

function errorKindLabelKey(kind: string): TranslationKey {
  return `productionExecution.errorKinds.${kind}` as TranslationKey
}

export function ProductionExecution() {
  const { t } = useLanguage()
  const { allowsAction, isChecking } = usePermissionActions()
  const routesQuery = useProductionRoutesQuery()
  const partnersQuery = useOutsourcePartners({ status: 'ACTIVE' })
  const canExecute = allowsAction('action_production_issuance_execute')

  const [captureMode, setCaptureMode] =
    useState<ProductionExecutionCaptureMode>('manual')
  const [barcode, setBarcode] = useState('')
  const [action, setAction] = useState<ProductionScanCommandAction>('START')
  const [executionLotId, setExecutionLotId] = useState('')
  const [routeId, setRouteId] = useState('')
  const [routeStepId, setRouteStepId] = useState('')
  const [targetRouteStepId, setTargetRouteStepId] = useState('')
  const [partnerId, setPartnerId] = useState('')
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

  const routes = useMemo(
    () =>
      (routesQuery.data ?? [])
        .filter((route) => route.status !== 'ARCHIVED')
        .sort((a, b) =>
          `${a.code}${a.name}`.localeCompare(`${b.code}${b.name}`)
        ),
    [routesQuery.data]
  )
  const selectedRoute = routes.find((route) => route.id === routeId)
  const routeSteps = useMemo(
    () =>
      [...(selectedRoute?.steps ?? [])].sort((a, b) => a.sequence - b.sequence),
    [selectedRoute]
  )
  const selectedStep = routeSteps.find((step) => step.id === routeStepId)
  const targetStep = routeSteps.find((step) => step.id === targetRouteStepId)
  const partners = partnersQuery.data?.items ?? []

  useEffect(() => {
    if (routeId && !selectedRoute) {
      setRouteId('')
      setRouteStepId('')
      setTargetRouteStepId('')
    }
  }, [routeId, selectedRoute])

  useEffect(() => {
    if (routeStepId && !routeSteps.some((step) => step.id === routeStepId)) {
      setRouteStepId('')
    }
    if (
      targetRouteStepId &&
      !routeSteps.some((step) => step.id === targetRouteStepId)
    ) {
      setTargetRouteStepId('')
    }
  }, [routeStepId, routeSteps, targetRouteStepId])

  const handleSubmit = async () => {
    if (!canExecute || isChecking || isSubmitting) {
      return
    }
    if (!barcode.trim()) {
      toast.error(t('productionExecution.validation.barcode'))
      return
    }
    if (action === 'START' && !routeId) {
      toast.error(t('productionExecution.validation.startRoute'))
      return
    }
    if (action === 'REWORK' && !targetRouteStepId) {
      toast.error(t('productionExecution.validation.reworkTarget'))
      return
    }

    const values: ProductionExecutionFormValues = {
      productBarcode: barcode,
      captureMode,
      action,
      executionLotId,
      routeId,
      routeStepId,
      processStepId: selectedStep?.processStepId ?? '',
      targetRouteStepId,
      targetProcessStepId: targetStep?.processStepId ?? '',
      partnerId,
      result,
      notes,
      fromHolderType,
      fromHolderId,
      toHolderType,
      toHolderId,
    }

    setIsSubmitting(true)
    setCommandError(null)
    try {
      const nextResponse = await productionScanCommandService.execute(
        buildProductionExecutionCommandInput(values)
      )
      setResponse(nextResponse)
      setBarcode('')
      toast.success(
        nextResponse.message || t('productionExecution.toasts.executed')
      )
    } catch (error) {
      const normalized = classifyProductionScanCommandError(error)
      setCommandError(normalized)
      toast.error(t('productionExecution.toasts.failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isForbiddenError(routesQuery.error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex animate-in flex-col gap-4 pb-8 duration-500 fade-in'>
      <IndustrialHeader
        icon={Activity}
        title={t('productionExecution.page.title')}
        description={t('productionExecution.page.description')}
      />

      <div className='grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'>
        <Card className={cn(industrialPanelClassName, 'gap-0 py-0')}>
          <div className={industrialPanelGradientClassName} />
          <CardHeader className='relative z-10 border-b border-dashed border-muted/20 bg-background/20 p-4 md:p-5'>
            <CardTitle className='flex items-center gap-2 text-base font-black'>
              <ScanLine className='size-4 text-primary' />
              {t('productionExecution.form.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className='relative z-10 space-y-5 p-4 md:p-5'>
            <div className='grid gap-2'>
              <span className={fieldLabelClass}>
                {t('productionExecution.fields.captureMode')}
              </span>
              <div className='grid grid-cols-3 gap-2'>
                {captureModes.map(({ value, icon: Icon, labelKey }) => (
                  <Button
                    key={value}
                    type='button'
                    variant={captureMode === value ? 'default' : 'outline'}
                    onClick={() => setCaptureMode(value)}
                    className='h-10 rounded-full px-2 text-xs font-bold'
                  >
                    <Icon className='size-3.5' />
                    <span className='truncate'>{t(labelKey)}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className='grid gap-2'>
              <span className={fieldLabelClass}>
                {t('productionExecution.fields.productBarcode')}
              </span>
              {captureMode === 'usb' ? (
                <HIDScanInput
                  value={barcode}
                  onValueChange={setBarcode}
                  onScanComplete={(code) => setBarcode(code)}
                  placeholder={t(
                    'productionExecution.placeholders.productBarcode'
                  )}
                  disabled={isSubmitting}
                  autoFocus
                  className='space-y-2'
                  inputClassName='h-11 rounded-xl border-primary/20'
                  showManualComplete={false}
                />
              ) : (
                <CameraScanInput
                  value={barcode}
                  onValueChange={setBarcode}
                  onScanComplete={setBarcode}
                  placeholder={t(
                    'productionExecution.placeholders.productBarcode'
                  )}
                  disabled={isSubmitting}
                  className='space-y-2'
                  inputClassName='h-11 rounded-xl border-primary/20'
                />
              )}
            </div>

            <div className='grid gap-2'>
              <span className={fieldLabelClass}>
                {t('productionExecution.fields.action')}
              </span>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                {(['START', 'COMPLETE', 'HOLD', 'REWORK'] as const).map(
                  (nextAction) => {
                    const Icon = actionIcons[nextAction]
                    return (
                      <Button
                        key={nextAction}
                        type='button'
                        variant={action === nextAction ? 'default' : 'outline'}
                        onClick={() => setAction(nextAction)}
                        className='h-10 rounded-full px-2 text-xs font-bold'
                      >
                        <Icon className='size-3.5' />
                        <span className='truncate'>
                          {t(actionKeys[nextAction])}
                        </span>
                      </Button>
                    )
                  }
                )}
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <Field label={t('productionExecution.fields.route')}>
                <select
                  value={routeId}
                  onChange={(event) => {
                    setRouteId(event.target.value)
                    setRouteStepId('')
                    setTargetRouteStepId('')
                  }}
                  className={selectClass}
                  disabled={routesQuery.isLoading || isSubmitting}
                >
                  <option value=''>
                    {t('productionExecution.placeholders.route')}
                  </option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.code} · {route.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('productionExecution.fields.currentStep')}>
                <select
                  value={routeStepId}
                  onChange={(event) => setRouteStepId(event.target.value)}
                  className={selectClass}
                  disabled={!selectedRoute || isSubmitting}
                >
                  <option value=''>
                    {t('productionExecution.placeholders.currentStep')}
                  </option>
                  {routeSteps.map((step) => (
                    <option key={step.id} value={step.id}>
                      {routeStepLabel(step)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {action === 'REWORK' ? (
              <Field label={t('productionExecution.fields.reworkTarget')}>
                <select
                  value={targetRouteStepId}
                  onChange={(event) => setTargetRouteStepId(event.target.value)}
                  className={selectClass}
                  disabled={!selectedRoute || isSubmitting}
                >
                  <option value=''>
                    {t('productionExecution.placeholders.reworkTarget')}
                  </option>
                  {routeSteps.map((step) => (
                    <option key={step.id} value={step.id}>
                      {routeStepLabel(step)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <div className='grid gap-3 sm:grid-cols-2'>
              <Field label={t('productionExecution.fields.executionLot')}>
                <Input
                  value={executionLotId}
                  onChange={(event) => setExecutionLotId(event.target.value)}
                  placeholder={t(
                    'productionExecution.placeholders.executionLot'
                  )}
                  disabled={isSubmitting}
                  className='h-10 rounded-xl'
                />
              </Field>
              <Field label={t('productionExecution.fields.partner')}>
                <select
                  value={partnerId}
                  onChange={(event) => setPartnerId(event.target.value)}
                  className={selectClass}
                  disabled={isSubmitting}
                >
                  <option value=''>
                    {t('productionExecution.placeholders.partner')}
                  </option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.code} · {partner.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label={t('productionExecution.fields.result')}>
              <Input
                value={result}
                onChange={(event) => setResult(event.target.value)}
                placeholder={t('productionExecution.placeholders.result')}
                disabled={isSubmitting}
                className='h-10 rounded-xl'
              />
            </Field>

            <details className='rounded-xl border border-dashed border-muted/30 bg-muted/10 p-3'>
              <summary className='cursor-pointer text-xs font-black text-muted-foreground'>
                {t('productionExecution.advanced.title')}
              </summary>
              <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                <Field label={t('productionExecution.fields.fromHolderType')}>
                  <Input
                    value={fromHolderType}
                    onChange={(event) => setFromHolderType(event.target.value)}
                    placeholder={t(
                      'productionExecution.placeholders.holderType'
                    )}
                    disabled={isSubmitting}
                    className='h-10 rounded-xl'
                  />
                </Field>
                <Field label={t('productionExecution.fields.fromHolderId')}>
                  <Input
                    value={fromHolderId}
                    onChange={(event) => setFromHolderId(event.target.value)}
                    placeholder={t('productionExecution.placeholders.holderId')}
                    disabled={isSubmitting}
                    className='h-10 rounded-xl'
                  />
                </Field>
                <Field label={t('productionExecution.fields.toHolderType')}>
                  <Input
                    value={toHolderType}
                    onChange={(event) => setToHolderType(event.target.value)}
                    placeholder={t(
                      'productionExecution.placeholders.holderType'
                    )}
                    disabled={isSubmitting}
                    className='h-10 rounded-xl'
                  />
                </Field>
                <Field label={t('productionExecution.fields.toHolderId')}>
                  <Input
                    value={toHolderId}
                    onChange={(event) => setToHolderId(event.target.value)}
                    placeholder={t('productionExecution.placeholders.holderId')}
                    disabled={isSubmitting}
                    className='h-10 rounded-xl'
                  />
                </Field>
              </div>
            </details>

            <Field label={t('productionExecution.fields.notes')}>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={t('productionExecution.placeholders.notes')}
                disabled={isSubmitting}
                className='min-h-20 rounded-xl'
              />
            </Field>

            <div className='flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-muted/30 pt-4'>
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                <Badge variant='outline' className='rounded-full'>
                  {captureMode === 'usb'
                    ? t('productionExecution.sources.USB')
                    : t('productionExecution.sources.WEB')}
                </Badge>
                <span>{t('productionExecution.form.ready')}</span>
              </div>
              <Button
                type='button'
                onClick={() => void handleSubmit()}
                disabled={
                  !canExecute || isChecking || isSubmitting || !barcode.trim()
                }
                title={
                  canExecute
                    ? undefined
                    : t('productionExecution.noExecutePermission')
                }
                className='h-10 rounded-full px-5 text-xs font-black'
              >
                {isSubmitting ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : (
                  <ScanLine className='size-4' />
                )}
                {t('productionExecution.actions.execute')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <ProductionExecutionResult
          response={response}
          commandError={commandError}
          t={t}
        />
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className='grid min-w-0 gap-1.5'>
      <span className={fieldLabelClass}>{label}</span>
      {children}
    </label>
  )
}

function ProductionExecutionResult({
  response,
  commandError,
  t,
}: {
  response: ProductionScanCommandApiResponseDTO | null
  commandError: ReturnType<typeof classifyProductionScanCommandError> | null
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}) {
  return (
    <Card className={cn(industrialPanelClassName, 'gap-0 py-0')}>
      <div className={industrialPanelGradientClassName} />
      <CardHeader className='relative z-10 border-b border-dashed border-muted/20 bg-background/20 p-4 md:p-5'>
        <CardTitle className='flex items-center gap-2 text-base font-black'>
          <Activity className='size-4 text-primary' />
          {t('productionExecution.result.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className='relative z-10 space-y-4 p-4 md:p-5'>
        {commandError ? (
          <div className='rounded-xl border border-rose-500/25 bg-rose-500/5 p-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='outline' className='rounded-full text-rose-600'>
                {t(errorKindLabelKey(commandError.kind))}
              </Badge>
              <span className='text-sm font-bold text-rose-700'>
                {t('productionExecution.result.failed')}
              </span>
            </div>
            <p className='mt-2 text-xs leading-relaxed text-rose-700/80'>
              {commandError.message}
            </p>
          </div>
        ) : null}

        {!response ? (
          <div className='flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-muted/30 bg-muted/10 px-6 text-center'>
            <ScanLine className='size-10 text-muted-foreground/25' />
            <p className='text-sm font-bold text-muted-foreground'>
              {t('productionExecution.result.empty')}
            </p>
          </div>
        ) : (
          <>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='truncate font-mono text-lg font-black tracking-wider'>
                  {response.state.productBarcode}
                </p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {response.message}
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Badge variant='outline' className='rounded-full'>
                  {t(sourceLabelKey(response.commandSource))}
                </Badge>
                <Badge
                  variant='outline'
                  className={cn(
                    'rounded-full',
                    statusTone(response.operation.status)
                  )}
                >
                  {displayValue(response.operation.status)}
                </Badge>
              </div>
            </div>

            <div className='grid gap-2 sm:grid-cols-2'>
              <ResultCell
                label={t('productionExecution.result.operation')}
                value={`${displayValue(response.operation.action)} · ${displayValue(response.operation.executionMode)}`}
              />
              <ResultCell
                label={t('productionExecution.result.barcodeState')}
                value={displayValue(response.state.status)}
              />
              <ResultCell
                label={t('productionExecution.result.route')}
                value={displayValue(response.state.routeId)}
              />
              <ResultCell
                label={t('productionExecution.result.currentProcess')}
                value={
                  response.state.currentProcessStep?.name ||
                  displayValue(response.state.currentProcessStepId)
                }
              />
            </div>

            <div className='rounded-xl border border-dashed border-muted/30 bg-muted/10 p-3'>
              <div className='mb-3 flex items-center gap-2 text-xs font-black text-muted-foreground'>
                <ArrowRight className='size-3.5' />
                {t('productionExecution.result.progress')}
              </div>
              <div className='grid gap-2 sm:grid-cols-3'>
                <ResultCell
                  label={t('productionExecution.result.executedStep')}
                  value={displayValue(response.progress.executedProcessStepId)}
                />
                <ResultCell
                  label={t('productionExecution.result.nextStep')}
                  value={displayValue(response.progress.nextProcessStepId)}
                />
                <ResultCell
                  label={t('productionExecution.result.routeCompleted')}
                  value={
                    response.progress.routeCompleted
                      ? t('productionExecution.result.yes')
                      : t('productionExecution.result.no')
                  }
                />
              </div>
            </div>

            <div className='rounded-xl border border-dashed border-muted/30 bg-muted/10 p-3'>
              <div className='mb-3 flex items-center gap-2 text-xs font-black text-muted-foreground'>
                <Clock3 className='size-3.5' />
                {t('productionExecution.result.transferEvents')}
              </div>
              {response.transferEvents.length === 0 ? (
                <p className='text-xs text-muted-foreground'>
                  {t('productionExecution.result.noTransfers')}
                </p>
              ) : (
                <div className='space-y-2'>
                  {response.transferEvents.map((event) => (
                    <div
                      key={event.id}
                      className='flex flex-wrap items-center justify-between gap-2 text-xs'
                    >
                      <span className='font-bold'>
                        {displayValue(event.transferType)}
                      </span>
                      <span className='text-muted-foreground'>
                        {displayValue(event.fromHolderId)} →{' '}
                        {displayValue(event.toHolderId)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ResultCell({ label, value }: { label: string; value: string }) {
  return (
    <div className='min-w-0 rounded-lg bg-muted/20 p-3'>
      <p className='text-[11px] font-bold text-muted-foreground'>{label}</p>
      <p className='mt-1 truncate text-sm font-black' title={value}>
        {value}
      </p>
    </div>
  )
}
