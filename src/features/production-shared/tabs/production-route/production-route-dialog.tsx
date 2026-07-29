import { useEffect, useMemo, useState } from 'react'
import { GitBranch, GripVertical, Plus, Trash2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ProductionProcessStep } from '../../data/production-process'
import type {
  ProductionRoute,
  ProductionRouteExecutionMode,
  ProductionRouteQualityDisposition,
  ProductionRouteQualityGate,
  ProductionRouteStatus,
  ProductionRouteStep,
} from '../../data/production-route'

export interface ProductionRouteSegmentOption {
  id: string
  label: string
  processes: ProductionProcessStep[]
}

interface ProductionRouteDialogProps {
  open: boolean
  route: ProductionRoute | null
  routes: ProductionRoute[]
  segments: ProductionRouteSegmentOption[]
  onOpenChange: (open: boolean) => void
  onSave: (route: ProductionRoute) => Promise<void>
}

const statusOptions: ProductionRouteStatus[] = [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
]
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

function createRouteCode(routes: ProductionRoute[]) {
  const usedCodes = new Set(routes.map((item) => item.code))
  let index = routes.length + 1
  let code = `route-${String(index).padStart(3, '0')}`
  while (usedCodes.has(code)) {
    index += 1
    code = `route-${String(index).padStart(3, '0')}`
  }
  return code
}

function createDraftRoute(routes: ProductionRoute[]): ProductionRoute {
  const now = new Date().toISOString()
  return {
    id: '',
    code: createRouteCode(routes),
    name: '',
    productId: '',
    productName: '',
    productTemplateId: '',
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
  segment?: ProductionRouteSegmentOption
): ProductionRouteStep {
  const now = new Date().toISOString()
  const process = segment?.processes[0]
  return {
    id: crypto.randomUUID(),
    routeId: '',
    sequence,
    processStepId: process?.id ?? '',
    processCode: process?.code ?? '',
    processName: process?.name ?? '',
    segmentId: segment?.id ?? '',
    segmentName: segment?.label ?? '',
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

function rebuildStepSequence(steps: ProductionRouteStep[]) {
  return steps.map((step, index) => ({ ...step, sequence: index + 1 }))
}

export function ProductionRouteDialog({
  open,
  route,
  routes,
  segments,
  onOpenChange,
  onSave,
}: ProductionRouteDialogProps) {
  const { t } = useLanguage()
  const [draft, setDraft] = useState<ProductionRoute>(() =>
    route ? { ...route, steps: [...route.steps] } : createDraftRoute(routes)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    setDraft(
      route
        ? { ...route, steps: route.steps.map((step) => ({ ...step })) }
        : createDraftRoute(routes)
    )
    setIsSubmitting(false)
  }, [open, route, routes])

  const segmentById = useMemo(
    () => new Map(segments.map((item) => [item.id, item])),
    [segments]
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

  const handleSegmentChange = (stepId: string, segmentId: string) => {
    const segment = segmentById.get(segmentId)
    const process = segment?.processes[0]
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              segmentId: segment?.id ?? '',
              segmentName: segment?.label ?? '',
              processStepId: process?.id ?? '',
              processCode: process?.code ?? '',
              processName: process?.name ?? '',
            }
          : step
      ),
    }))
  }

  const handleProcessChange = (stepId: string, processId: string) => {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((step) => {
        if (step.id !== stepId) {
          return step
        }
        const process = segmentById
          .get(step.segmentId)
          ?.processes.find((item) => item.id === processId)
        return {
          ...step,
          processStepId: process?.id ?? '',
          processCode: process?.code ?? '',
          processName: process?.name ?? '',
        }
      }),
    }))
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
          const targetStep = current.steps.find(
            (candidate) => candidate.id === targetRouteStepId
          )
          routing[disposition] = {
            targetRouteStepId,
            targetProcessStepId: targetStep?.processStepId || undefined,
          }
        }
        return {
          ...step,
          qualityRouting: Object.keys(routing).length > 0 ? routing : undefined,
        }
      }),
    }))
  }

  const addStep = () => {
    setDraft((current) => ({
      ...current,
      steps: [
        ...current.steps,
        createRouteStep(current.steps.length + 1, segments[0]),
      ],
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
    if (!draft.name.trim() || !draft.code.trim()) {
      return
    }
    const steps = rebuildStepSequence(draft.steps).filter(
      (step) => step.processStepId && step.segmentId
    )
    if (steps.length !== draft.steps.length) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSave({
        ...draft,
        code: draft.code.trim(),
        name: draft.name.trim(),
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
      <DialogContent className='w-[96vw] max-w-[1080px] rounded-[30px] border-none p-0 shadow-2xl'>
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/8 via-transparent to-orange-500/5' />
        <div className='relative space-y-5 p-5 md:p-7'>
          <DialogHeader className='text-left'>
            <div className='flex items-center gap-3'>
              <div className='flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary'>
                <GitBranch className='size-5' />
              </div>
              <div className='space-y-1'>
                <DialogTitle className='text-sm font-black tracking-tighter uppercase italic'>
                  {route
                    ? t('productionArchitecture.routes.dialog.editTitle')
                    : t('productionArchitecture.routes.dialog.createTitle')}
                </DialogTitle>
                <DialogDescription className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {t('productionArchitecture.routes.dialog.description')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='grid gap-4 md:grid-cols-[1.2fr_0.8fr_0.8fr]'>
            <label className='space-y-2'>
              <Label>{t('productionArchitecture.routes.fields.name')}</Label>
              <Input
                value={draft.name}
                onChange={(event) => updateRoute('name', event.target.value)}
                placeholder={t(
                  'productionArchitecture.routes.fields.namePlaceholder'
                )}
              />
            </label>
            <label className='space-y-2'>
              <Label>{t('productionArchitecture.routes.fields.code')}</Label>
              <Input
                value={draft.code}
                onChange={(event) =>
                  updateRoute('code', event.target.value.toLowerCase())
                }
              />
            </label>
            <label className='space-y-2'>
              <Label>{t('productionArchitecture.routes.fields.status')}</Label>
              <Select
                value={draft.status}
                onValueChange={(value) =>
                  updateRoute('status', value as ProductionRouteStatus)
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`productionArchitecture.routes.statuses.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className='grid gap-4 md:grid-cols-[0.8fr_1.2fr]'>
            <label className='space-y-2'>
              <Label>
                {t('productionArchitecture.routes.fields.productName')}
              </Label>
              <Input
                value={draft.productName}
                onChange={(event) =>
                  updateRoute('productName', event.target.value)
                }
                placeholder={t(
                  'productionArchitecture.routes.fields.productPlaceholder'
                )}
              />
            </label>
            <label className='space-y-2'>
              <Label>
                {t('productionArchitecture.routes.fields.description')}
              </Label>
              <Textarea
                value={draft.description}
                onChange={(event) =>
                  updateRoute('description', event.target.value)
                }
                className='min-h-10'
              />
            </label>
          </div>

          <div className='space-y-3 rounded-[24px] border border-dashed border-muted/60 bg-muted/10 p-3'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <p className='text-xs font-black tracking-widest uppercase'>
                  {t('productionArchitecture.routes.steps.title')}
                </p>
                <p className='text-[10px] font-bold text-muted-foreground'>
                  {t('productionArchitecture.routes.steps.description')}
                </p>
              </div>
              <Button
                type='button'
                size='sm'
                onClick={addStep}
                disabled={segments.length === 0}
                className='rounded-full'
              >
                <Plus className='mr-2 size-4' />
                {t('productionArchitecture.routes.steps.add')}
              </Button>
            </div>

            {segments.length === 0 ? (
              <div className='rounded-2xl bg-background/70 p-5 text-center text-xs font-bold text-muted-foreground'>
                {t('productionArchitecture.routes.steps.noSegments')}
              </div>
            ) : draft.steps.length === 0 ? (
              <div className='rounded-2xl bg-background/70 p-5 text-center text-xs font-bold text-muted-foreground'>
                {t('productionArchitecture.routes.steps.empty')}
              </div>
            ) : (
              <div className='space-y-2'>
                {draft.steps.map((step, index) => {
                  const selectedSegment = segmentById.get(step.segmentId)
                  const processes = selectedSegment?.processes ?? []
                  return (
                    <div
                      key={step.id}
                      className='grid gap-2 rounded-2xl border bg-background/80 p-3 lg:grid-cols-[48px_1fr_1fr_0.8fr_0.7fr_0.6fr_auto]'
                    >
                      <div className='flex items-center gap-2 text-xs font-black text-muted-foreground'>
                        <GripVertical className='size-4' />
                        {index + 1}
                      </div>
                      <Select
                        value={step.segmentId}
                        onValueChange={(value) =>
                          handleSegmentChange(step.id, value)
                        }
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue
                            placeholder={t(
                              'productionArchitecture.routes.steps.segment'
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {segments.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={step.processStepId || 'NO_PROCESS'}
                        onValueChange={(value) =>
                          handleProcessChange(step.id, value)
                        }
                        disabled={processes.length === 0}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue
                            placeholder={t(
                              'productionArchitecture.routes.steps.process'
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {processes.length === 0 ? (
                            <SelectItem value='NO_PROCESS' disabled>
                              {t(
                                'productionArchitecture.routes.steps.noProcess'
                              )}
                            </SelectItem>
                          ) : (
                            processes.map((process) => (
                              <SelectItem key={process.id} value={process.id}>
                                {process.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Select
                        value={step.executionMode}
                        onValueChange={(value) =>
                          handleExecutionModeChange(
                            step.id,
                            value as ProductionRouteExecutionMode
                          )
                        }
                      >
                        <SelectTrigger className='w-full'>
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
                      <Select
                        value={step.qualityGate}
                        onValueChange={(value) =>
                          handleQualityGateChange(
                            step.id,
                            value as ProductionRouteQualityGate
                          )
                        }
                      >
                        <SelectTrigger className='w-full'>
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
                      <Input
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
                        placeholder={t(
                          'productionArchitecture.routes.steps.minutes'
                        )}
                      />
                      <div className='flex items-center justify-end gap-1'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          disabled={index === 0}
                          onClick={() => moveStep(step.id, -1)}
                        >
                          ↑
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          disabled={index === draft.steps.length - 1}
                          onClick={() => moveStep(step.id, 1)}
                        >
                          ↓
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          onClick={() => removeStep(step.id)}
                        >
                          <Trash2 className='size-4 text-destructive' />
                        </Button>
                      </div>
                      <label className='flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase lg:col-span-3'>
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
                        {t('productionArchitecture.routes.steps.transfer')}
                      </label>
                      {step.qualityGate !== 'NONE' ? (
                        <div className='grid gap-2 border-t border-muted/50 pt-2 md:grid-cols-2 lg:col-span-7'>
                          {qualityRoutingDispositionOptions.map(
                            (disposition) => {
                              const configuredTarget =
                                step.qualityRouting?.[disposition]
                              const targetRouteStepId =
                                configuredTarget?.targetRouteStepId ||
                                draft.steps.find(
                                  (candidate) =>
                                    candidate.processStepId ===
                                    configuredTarget?.targetProcessStepId
                                )?.id ||
                                'NO_TARGET'
                              return (
                                <label key={disposition} className='space-y-1'>
                                  <span className='text-[10px] font-black text-muted-foreground uppercase'>
                                    {t(qualityRoutingLabelKeys[disposition])}
                                  </span>
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
                                    <SelectTrigger className='w-full'>
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
                                            targetStep.processCode ||
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
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              {t('common.actions.cancel')}
            </Button>
            <Button
              type='button'
              onClick={() => void handleSave()}
              disabled={
                isSubmitting || !draft.name.trim() || !draft.code.trim()
              }
            >
              {isSubmitting
                ? t('common.status.syncing')
                : t('common.actions.save')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
