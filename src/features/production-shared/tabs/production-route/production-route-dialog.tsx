import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, GitBranch, Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ProductionProcessStep } from '../../data/production-process'
import { productionResourceQueryKeys } from '../../data/production-resource-query-keys'
import {
  getProductionRouteBOMBranchIdentityKey,
  type ProductionRoute,
  type ProductionRouteBOMBranch,
  type ProductionRouteExecutionMode,
  type ProductionRouteQualityDisposition,
  type ProductionRouteQualityGate,
  type ProductionRouteStep,
} from '../../data/production-route'
import { productionRoutesService } from '../../services/production-routes-service'

interface ProductionRouteDialogProps {
  open: boolean
  route: ProductionRoute | null
  bomBranches: ProductionRouteBOMBranch[]
  bomBranchesLoading: boolean
  onOpenChange: (open: boolean) => void
  onSave: (route: ProductionRoute) => Promise<void>
  onRestoreBranchDefault: (salesOrderLineID: number) => Promise<void>
}

const executionModeOptions: ProductionRouteExecutionMode[] = [
  'IN_HOUSE',
  'OUTSOURCE_ALLOWED',
  'OUTSOURCE_REQUIRED',
]
const qualityGateOptions: ProductionRouteQualityGate[] = [
  'NONE',
  'OPTIONAL',
  'REQUIRED',
]
const qualityRoutingDispositionOptions = ['REWORK', 'CONCESSION'] as const
const qualityRoutingLabelKeys = {
  REWORK: 'productionArchitecture.routes.steps.reworkTarget',
  CONCESSION: 'productionArchitecture.routes.steps.concessionTarget',
} as const

function createRouteCode(salesOrderLineId: number) {
  return `SO-LINE-${salesOrderLineId}`
}

function createDraftRoute(): ProductionRoute {
  const now = new Date().toISOString()
  return {
    id: '',
    routeFamilyId: '',
    revisionNo: 1,
    basedOnRouteId: '',
    isCurrentRevision: false,
    code: '',
    name: '',
    productId: '',
    productSKU: '',
    productName: '',
    bomOwnerType: '',
    bomOwnerCustomerId: '',
    bomOwnerCustomerName: '',
    bomVersionLevel: '',
    scopeType: 'SALES_ORDER_LINE',
    salesOrderLineId: undefined,
    salesOrderNo: undefined,
    salesOrderLineNo: undefined,
    description: '',
    version: 1,
    status: 'DRAFT',
    steps: [],
    createdAt: now,
    updatedAt: now,
  }
}

function createRouteStep(
  sequence: number,
  process?: ProductionProcessStep
): ProductionRouteStep {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    routeId: '',
    sequence,
    processStepId: process?.id ?? '',
    processName: process?.name ?? '',
    processDescription: process?.description ?? '',
    executionMode: 'IN_HOUSE',
    qualityGate: 'NONE',
    qualityRouting: undefined,
    estimatedMinutes: 0,
    transferRequired: false,
    description: '',
    createdAt: now,
    updatedAt: now,
  }
}

function createDefaultRouteSteps(processes: ProductionProcessStep[]) {
  return processes
    .filter((process) => process.isActive !== false)
    .map((process, index) => createRouteStep(index + 1, process))
}

function rebuildStepSequence(steps: ProductionRouteStep[]) {
  return steps.map((step, index) => ({ ...step, sequence: index + 1 }))
}

export function ProductionRouteDialog({
  open,
  route,
  bomBranches,
  bomBranchesLoading,
  onOpenChange,
  onSave,
  onRestoreBranchDefault,
}: ProductionRouteDialogProps) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState<ProductionRoute>(() =>
    route ? { ...route, steps: [...route.steps] } : createDraftRoute()
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedRouteMode, setSelectedRouteMode] = useState<
    'DEFAULT' | 'CUSTOM'
  >(route ? 'CUSTOM' : 'DEFAULT')
  useEffect(() => {
    if (!open) {
      return
    }
    setDraft(
      route
        ? { ...route, steps: route.steps.map((step) => ({ ...step })) }
        : createDraftRoute()
    )
    setSelectedRouteMode(route ? 'CUSTOM' : 'DEFAULT')
    setIsSubmitting(false)
  }, [open, route])

  const selectedBOMBranchKey = getProductionRouteBOMBranchIdentityKey(draft)
  const branchByIdentityKey = new Map(
    bomBranches.map((branch) => [
      getProductionRouteBOMBranchIdentityKey(branch),
      branch,
    ])
  )
  const processes = (
    branchByIdentityKey.get(selectedBOMBranchKey)?.processes ?? []
  )
    .filter((process) => process.isActive !== false)
    .sort(
      (left, right) =>
        (left.sortOrder ?? 0) - (right.sortOrder ?? 0) ||
        left.name.localeCompare(right.name)
    )
  const orderLineCandidatesQuery = useQuery({
    queryKey: productionResourceQueryKeys.routeSalesOrderLineCandidates(''),
    queryFn: () => productionRoutesService.getSalesOrderLineCandidates(),
    enabled: open,
  })
  const orderLineCandidates = orderLineCandidatesQuery.data ?? []
  const selectableOrderLineCandidates = route
    ? orderLineCandidates
    : orderLineCandidates.filter((candidate) => !candidate.hasProductionRoute)
  const selectedOrderLine = orderLineCandidates.find(
    (candidate) => candidate.id === draft.salesOrderLineId
  )
  useEffect(() => {
    if (selectedOrderLine) {
      setSelectedRouteMode(selectedOrderLine.productionRouteMode)
    }
  }, [route, selectedOrderLine])
  const generatedRouteName = route
    ? draft.name
    : selectedOrderLine
      ? t('productionArchitecture.routes.generatedName.orderLine', {
          orderNo: selectedOrderLine.salesOrderNo,
          lineNo: selectedOrderLine.lineNo,
        })
      : ''
  const selectedProcessIDs = new Set(
    draft.steps.map((step) => step.processStepId)
  )

  const updateRoute = <TKey extends keyof ProductionRoute>(
    key: TKey,
    value: ProductionRoute[TKey]
  ) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const updateStep = <TKey extends keyof ProductionRouteStep>(
    stepId: string,
    key: TKey,
    value: ProductionRouteStep[TKey]
  ) => {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.id === stepId ? { ...step, [key]: value } : step
      ),
    }))
  }

  const handleProcessLibraryChange = (
    processStepId: string,
    selected: boolean
  ) => {
    const process = processes.find(
      (candidate) => candidate.id === processStepId
    )
    if (!process || process.isActive === false) {
      return
    }
    if (!selected) {
      const step = draft.steps.find(
        (candidate) => candidate.processStepId === processStepId
      )
      if (step) {
        removeStep(step.id)
      }
      return
    }
    setDraft((current) => ({
      ...current,
      steps: rebuildStepSequence([
        ...current.steps,
        createRouteStep(current.steps.length + 1, process),
      ]),
    }))
  }

  const handleSalesOrderLineChange = (candidateID: string) => {
    const candidate = orderLineCandidates.find(
      (line) => String(line.id) === candidateID
    )
    if (!candidate) {
      return
    }
    const branchKey = getProductionRouteBOMBranchIdentityKey(candidate)
    const branch = branchByIdentityKey.get(branchKey)
    if (!branch) {
      return
    }
    setDraft((current) => ({
      ...current,
      code: route ? current.code : createRouteCode(candidate.id),
      productId: branch.productId,
      productSKU: branch.productSKU,
      productName: branch.productName,
      bomOwnerType: branch.bomOwnerType,
      bomOwnerCustomerId: branch.bomOwnerCustomerId,
      bomOwnerCustomerName: branch.bomOwnerCustomerName,
      bomVersionLevel: branch.bomVersionLevel,
      salesOrderLineId: candidate.id,
      salesOrderNo: candidate.salesOrderNo,
      salesOrderLineNo: candidate.lineNo,
      steps: createDefaultRouteSteps(branch.processes),
    }))
    setSelectedRouteMode(candidate.productionRouteMode || 'DEFAULT')
  }

  const handleExecutionModeChange = (
    stepId: string,
    executionMode: ProductionRouteExecutionMode
  ) => {
    updateStep(stepId, 'executionMode', executionMode)
    if (executionMode !== 'IN_HOUSE') {
      updateStep(stepId, 'transferRequired', true)
    }
  }

  const handleQualityGateChange = (
    stepId: string,
    qualityGate: ProductionRouteQualityGate
  ) => {
    updateStep(stepId, 'qualityGate', qualityGate)
    if (qualityGate === 'NONE') {
      updateStep(stepId, 'qualityRouting', undefined)
    }
  }

  const updateQualityRouting = (
    stepId: string,
    disposition: ProductionRouteQualityDisposition,
    targetRouteStepId: string
  ) => {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step) => {
        if (step.id !== stepId) {
          return step
        }
        const routing = { ...(step.qualityRouting || {}) }
        if (targetRouteStepId === 'NO_TARGET') {
          delete routing[disposition]
        } else {
          routing[disposition] = {
            targetRouteStepId,
          }
        }
        return {
          ...step,
          qualityRouting: Object.keys(routing).length > 0 ? routing : undefined,
        }
      }),
    }))
  }

  const removeStep = (stepId: string) => {
    setDraft((current) => ({
      ...current,
      steps: rebuildStepSequence(
        current.steps.filter((step) => step.id !== stepId)
      ).map((step) => {
        if (!step.qualityRouting) {
          return step
        }
        const routing = Object.fromEntries(
          Object.entries(step.qualityRouting).filter(
            ([, target]) => target.targetRouteStepId !== stepId
          )
        )
        return {
          ...step,
          qualityRouting: Object.keys(routing).length > 0 ? routing : undefined,
        }
      }),
    }))
  }

  const moveStep = (stepId: string, direction: -1 | 1) => {
    setDraft((current) => {
      const index = current.steps.findIndex((step) => step.id === stepId)
      const nextIndex = index + direction
      if (index < 0 || nextIndex < 0 || nextIndex >= current.steps.length) {
        return current
      }
      const steps = [...current.steps]
      const [target] = steps.splice(index, 1)
      steps.splice(nextIndex, 0, target)
      return { ...current, steps: rebuildStepSequence(steps) }
    })
  }

  const handleSave = async () => {
    if (selectedRouteMode === 'DEFAULT') {
      if (!draft.salesOrderLineId) {
        return
      }
      setIsSubmitting(true)
      try {
        await onRestoreBranchDefault(draft.salesOrderLineId)
        onOpenChange(false)
      } catch {
        return
      } finally {
        setIsSubmitting(false)
      }
      return
    }
    if (
      !generatedRouteName.trim() ||
      !draft.code.trim() ||
      draft.steps.length === 0 ||
      !draft.salesOrderLineId
    ) {
      return
    }
    if (!selectedBOMBranchKey) {
      return
    }
    const steps = rebuildStepSequence(draft.steps).filter(
      (step) => step.processStepId
    )
    if (steps.length !== draft.steps.length) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSave({
        ...draft,
        code: draft.code.trim(),
        name: generatedRouteName.trim(),
        productName: draft.productName.trim(),
        description: draft.description.trim(),
        steps,
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[min(90dvh,900px)] max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] max-w-[1120px] flex-col gap-0 overflow-hidden rounded-lg p-0 sm:w-[calc(100vw-48px)]'>
        <DialogHeader className='shrink-0 border-b px-5 py-4 text-left md:px-7'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary'>
              <GitBranch className='size-4' />
            </div>
            <div className='min-w-0 space-y-1'>
              <DialogTitle className='text-base font-semibold'>
                {route
                  ? t('productionArchitecture.routes.dialog.editTitle')
                  : t('productionArchitecture.routes.dialog.createTitle')}
              </DialogTitle>
              <DialogDescription className='text-xs'>
                {t('productionArchitecture.routes.dialog.description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div
          data-mobile-floating-surface-layout='column'
          className='min-h-0 flex-1 overflow-hidden'
        >
          <div
            data-mobile-floating-surface-scroll-body
            className='h-full min-h-0 space-y-6 overflow-y-auto p-4 md:p-6'
          >
            <section className='space-y-4 border-b pb-5'>
              <div className='space-y-1'>
                <h3 className='text-sm font-semibold'>
                  {t('productionArchitecture.routes.dialog.scopeDetails')}
                </h3>
                <p className='text-xs text-muted-foreground'>
                  {t('productionArchitecture.routes.dialog.scopeDescription')}
                </p>
              </div>
              <div className='space-y-2'>
                <Label>
                  {t('productionArchitecture.routes.fields.salesOrderLine')}
                </Label>
                <Select
                  value={draft.salesOrderLineId?.toString() ?? ''}
                  onValueChange={handleSalesOrderLineChange}
                  disabled={
                    Boolean(route) ||
                    orderLineCandidatesQuery.isLoading ||
                    bomBranchesLoading
                  }
                >
                  <SelectTrigger className='h-10 w-full'>
                    <SelectValue
                      placeholder={t(
                        'productionArchitecture.routes.fields.salesOrderLinePlaceholder'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableOrderLineCandidates.map((candidate) => (
                      <SelectItem
                        key={candidate.id}
                        value={String(candidate.id)}
                      >
                        {t(
                          'productionArchitecture.routes.salesOrderLineOption',
                          {
                            orderNo: candidate.salesOrderNo,
                            lineNo: candidate.lineNo,
                            productModel:
                              candidate.productModel || candidate.productCode,
                          }
                        )}
                      </SelectItem>
                    ))}
                    {selectableOrderLineCandidates.length === 0 ? (
                      <SelectItem value='NO_ORDER_LINE' disabled>
                        {t(
                          'productionArchitecture.routes.fields.noSalesOrderLines'
                        )}
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
              <label className='block space-y-2'>
                <Label>
                  {t('productionArchitecture.routes.fields.description')}
                </Label>
                <Textarea
                  value={draft.description}
                  onChange={(event) =>
                    updateRoute('description', event.target.value)
                  }
                  className='min-h-20 w-full resize-y'
                />
              </label>
            </section>

            <section className='space-y-4'>
              <div className='space-y-3'>
                <div>
                  <h3 className='text-sm font-semibold'>
                    {t('productionArchitecture.routes.steps.title')}
                  </h3>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {t('productionArchitecture.routes.steps.description')}
                  </p>
                </div>
                {selectedBOMBranchKey ? (
                  <RadioGroup
                    value={selectedRouteMode}
                    onValueChange={(value) =>
                      setSelectedRouteMode(value as 'DEFAULT' | 'CUSTOM')
                    }
                    className='grid gap-2 sm:grid-cols-2'
                    aria-label={t('productionArchitecture.routes.mode.label')}
                  >
                    <label className='flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm'>
                      <RadioGroupItem value='DEFAULT' />
                      <span>
                        {t('productionArchitecture.routes.mode.default')}
                      </span>
                    </label>
                    <label className='flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm'>
                      <RadioGroupItem value='CUSTOM' />
                      <span>
                        {t('productionArchitecture.routes.mode.custom')}
                      </span>
                    </label>
                  </RadioGroup>
                ) : null}
              </div>

              {!selectedBOMBranchKey ? (
                <div className='rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground'>
                  {t('productionArchitecture.routes.steps.noBranchSelected')}
                </div>
              ) : bomBranchesLoading ? (
                <div className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
                  {t(
                    'productionArchitecture.routes.fields.loadingBranchOperations'
                  )}
                </div>
              ) : processes.length === 0 ? (
                <div className='rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground'>
                  {t('productionArchitecture.routes.steps.noProcess')}
                </div>
              ) : selectedRouteMode === 'DEFAULT' ? (
                <ol className='divide-y rounded-md border'>
                  {processes.map((process, index) => (
                    <li
                      key={process.id}
                      className='flex min-h-11 items-center gap-3 px-3 py-2 text-sm'
                    >
                      <span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary'>
                        {index + 1}
                      </span>
                      <span className='min-w-0 flex-1 truncate'>
                        {process.name}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <h4 className='text-sm font-medium'>
                      {t(
                        'productionArchitecture.routes.steps.selectOperations'
                      )}
                    </h4>
                    <div className='grid gap-2 sm:grid-cols-2'>
                      {processes.map((process) => (
                        <label
                          key={process.id}
                          className='flex min-h-10 min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-sm'
                        >
                          <Checkbox
                            checked={selectedProcessIDs.has(process.id)}
                            onCheckedChange={(checked) =>
                              handleProcessLibraryChange(
                                process.id,
                                checked === true
                              )
                            }
                          />
                          <span className='min-w-0 truncate'>
                            {process.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {draft.steps.length === 0 ? (
                    <div className='rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground'>
                      {t('productionArchitecture.routes.steps.empty')}
                    </div>
                  ) : null}
                  {draft.steps.map((step, index) => {
                    return (
                      <div
                        key={step.id}
                        className='space-y-3 rounded-lg border bg-background p-3 md:p-4'
                      >
                        <div className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]'>
                          <div className='flex min-w-0 items-center gap-3'>
                            <span className='flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary'>
                              {index + 1}
                            </span>
                            <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                              {step.processName || step.processStepId}
                            </span>
                          </div>
                          <div
                            role='group'
                            aria-label={`${t('productionArchitecture.routes.steps.stepActions')} ${index + 1}`}
                            className='flex items-end justify-end gap-1'
                          >
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='rounded-full'
                              disabled={index === 0}
                              onClick={() => moveStep(step.id, -1)}
                              aria-label={t(
                                'productionArchitecture.routes.steps.moveUp'
                              )}
                            >
                              <ArrowUp className='size-4' />
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='rounded-full'
                              disabled={index === draft.steps.length - 1}
                              onClick={() => moveStep(step.id, 1)}
                              aria-label={t(
                                'productionArchitecture.routes.steps.moveDown'
                              )}
                            >
                              <ArrowDown className='size-4' />
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              className='rounded-full'
                              onClick={() => removeStep(step.id)}
                              aria-label={t(
                                'productionArchitecture.routes.steps.remove'
                              )}
                            >
                              <Trash2 className='size-4 text-destructive' />
                            </Button>
                          </div>
                        </div>
                        <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                          <label className='min-w-0 space-y-1.5'>
                            <Label>
                              {t(
                                'productionArchitecture.routes.steps.executionMode'
                              )}
                            </Label>
                            <Select
                              value={step.executionMode}
                              onValueChange={(value) =>
                                handleExecutionModeChange(
                                  step.id,
                                  value as ProductionRouteExecutionMode
                                )
                              }
                            >
                              <SelectTrigger className='h-10 w-full'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {executionModeOptions.map((mode) => (
                                  <SelectItem key={mode} value={mode}>
                                    {t(
                                      `productionArchitecture.routes.executionModes.${mode}`
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </label>
                          <label className='min-w-0 space-y-1.5'>
                            <Label>
                              {t(
                                'productionArchitecture.routes.steps.qualityGate'
                              )}
                            </Label>
                            <Select
                              value={step.qualityGate}
                              onValueChange={(value) =>
                                handleQualityGateChange(
                                  step.id,
                                  value as ProductionRouteQualityGate
                                )
                              }
                            >
                              <SelectTrigger className='h-10 w-full'>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {qualityGateOptions.map((gate) => (
                                  <SelectItem key={gate} value={gate}>
                                    {t(
                                      `productionArchitecture.routes.qualityGates.${gate}`
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </label>
                          <label className='min-w-0 space-y-1.5'>
                            <Label>
                              {t(
                                'productionArchitecture.routes.steps.estimatedMinutes'
                              )}
                            </Label>
                            <Input
                              className='h-10 w-full'
                              type='number'
                              min={0}
                              value={step.estimatedMinutes}
                              onChange={(event) =>
                                updateStep(
                                  step.id,
                                  'estimatedMinutes',
                                  Number(event.target.value) || 0
                                )
                              }
                            />
                          </label>
                          <div className='min-w-0 space-y-1.5'>
                            <Label>
                              {t(
                                'productionArchitecture.routes.steps.transferShort'
                              )}
                            </Label>
                            <label className='flex h-10 items-center gap-2 rounded-md border px-3 text-sm'>
                              <Checkbox
                                checked={step.transferRequired}
                                disabled={step.executionMode !== 'IN_HOUSE'}
                                onCheckedChange={(checked) =>
                                  updateStep(
                                    step.id,
                                    'transferRequired',
                                    checked === true
                                  )
                                }
                              />
                              <span className='min-w-0 truncate'>
                                {t(
                                  'productionArchitecture.routes.steps.transfer'
                                )}
                              </span>
                            </label>
                          </div>
                        </div>
                        {step.qualityGate !== 'NONE' ? (
                          <div className='grid gap-3 rounded-md bg-muted/40 p-3 sm:grid-cols-2'>
                            <p className='text-xs font-semibold sm:col-span-2'>
                              {t(
                                'productionArchitecture.routes.steps.qualityRouting'
                              )}
                            </p>
                            {qualityRoutingDispositionOptions.map(
                              (disposition) => {
                                const configuredTarget =
                                  step.qualityRouting?.[disposition]
                                const targetRouteStepId =
                                  configuredTarget?.targetRouteStepId ||
                                  'NO_TARGET'
                                return (
                                  <label
                                    key={disposition}
                                    className='min-w-0 space-y-1.5'
                                  >
                                    <Label>
                                      {t(qualityRoutingLabelKeys[disposition])}
                                    </Label>
                                    <Select
                                      value={targetRouteStepId}
                                      onValueChange={(value) =>
                                        updateQualityRouting(
                                          step.id,
                                          disposition,
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger className='h-10 w-full'>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value='NO_TARGET'>
                                          {t(
                                            'productionArchitecture.routes.steps.noQualityTarget'
                                          )}
                                        </SelectItem>
                                        {draft.steps.map((targetStep) => (
                                          <SelectItem
                                            key={targetStep.id}
                                            value={targetStep.id}
                                          >
                                            {targetStep.sequence}.{' '}
                                            {targetStep.processName ||
                                              targetStep.processStepId}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </label>
                                )
                              }
                            )}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              className='rounded-full'
              onClick={() => onOpenChange(false)}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button
              type='button'
              className='rounded-full'
              onClick={() => void handleSave()}
              disabled={
                isSubmitting ||
                !draft.salesOrderLineId ||
                (selectedRouteMode === 'CUSTOM' &&
                  (!generatedRouteName.trim() ||
                    !draft.code.trim() ||
                    !selectedBOMBranchKey ||
                    draft.steps.length === 0 ||
                    draft.steps.some((step) => !step.processStepId)))
              }
            >
              {isSubmitting
                ? t('common.status.syncing')
                : t(
                    selectedRouteMode === 'DEFAULT'
                      ? 'productionArchitecture.routes.mode.saveDefault'
                      : 'productionArchitecture.routes.mode.saveCustom'
                  )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
