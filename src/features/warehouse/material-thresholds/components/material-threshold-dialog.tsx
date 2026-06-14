'use client'

import { useEffect, useReducer } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  type InventoryThresholdBOMOption,
  type InventoryThresholdMaterialOption,
  type InventoryThresholdRule,
  type InventoryThresholdRuleWritePayload,
  type InventoryThresholdTargetType,
} from '../data/schema'
import { MaterialThresholdTargetPicker } from './material-threshold-target-picker'

interface MaterialThresholdDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: InventoryThresholdRule | null
  materialOptions: InventoryThresholdMaterialOption[]
  bomOptions: InventoryThresholdBOMOption[]
  isSubmitting: boolean
  onSubmit: (payload: InventoryThresholdRuleWritePayload) => Promise<void>
  lockedTargetType?: InventoryThresholdTargetType
  lockedMaterialId?: string
  lockedBomId?: string
}

interface MaterialThresholdDialogState {
  targetType: InventoryThresholdTargetType
  materialId: string
  bomId: string
  thresholdQty: string
  enabled: boolean
  notes: string
}

type MaterialThresholdDialogAction =
  | { type: 'reset'; payload: MaterialThresholdDialogState }
  | { type: 'setTargetType'; payload: InventoryThresholdTargetType }
  | { type: 'setMaterialId'; payload: string }
  | { type: 'setBomId'; payload: string }
  | { type: 'setThresholdQty'; payload: string }
  | { type: 'setEnabled'; payload: boolean }
  | { type: 'setNotes'; payload: string }

interface MaterialThresholdDialogSeed {
  targetType?: InventoryThresholdTargetType
  materialId?: string
  bomId?: string
  thresholdQty?: number
  enabled?: boolean
  notes?: string
}

function getInitialDialogState(
  seed?: MaterialThresholdDialogSeed
): MaterialThresholdDialogState {
  return {
    targetType: seed?.targetType ?? 'MATERIAL',
    materialId: seed?.materialId ?? '',
    bomId: seed?.bomId ?? '',
    thresholdQty:
      seed && Number.isFinite(seed.thresholdQty)
        ? String(seed.thresholdQty)
        : '',
    enabled: seed?.enabled ?? true,
    notes: seed?.notes ?? '',
  }
}

function buildDialogState(
  seed?: MaterialThresholdDialogSeed,
  lockedTargetType?: InventoryThresholdTargetType,
  lockedMaterialId?: string,
  lockedBomId?: string
): MaterialThresholdDialogState {
  const initialState = getInitialDialogState(seed)

  return {
    ...initialState,
    targetType: lockedTargetType ?? initialState.targetType,
    materialId: lockedMaterialId ?? initialState.materialId,
    bomId: lockedBomId ?? initialState.bomId,
  }
}

function materialThresholdDialogReducer(
  state: MaterialThresholdDialogState,
  action: MaterialThresholdDialogAction
): MaterialThresholdDialogState {
  switch (action.type) {
    case 'reset':
      return action.payload
    case 'setTargetType':
      return { ...state, targetType: action.payload }
    case 'setMaterialId':
      return { ...state, materialId: action.payload }
    case 'setBomId':
      return { ...state, bomId: action.payload }
    case 'setThresholdQty':
      return { ...state, thresholdQty: action.payload }
    case 'setEnabled':
      return { ...state, enabled: action.payload }
    case 'setNotes':
      return { ...state, notes: action.payload }
    default:
      return state
  }
}

interface ThresholdDialogTargetSummary {
  primary: string
  secondary: string
  code: string
}

function resolveDialogTargetSummary(
  targetType: InventoryThresholdTargetType,
  materialId: string,
  bomId: string,
  materialOptions: InventoryThresholdMaterialOption[],
  bomOptions: InventoryThresholdBOMOption[]
): ThresholdDialogTargetSummary | null {
  if (targetType === 'MATERIAL') {
    const material = materialOptions.find((item) => item.id === materialId)
    if (!material) {
      return null
    }

    return {
      primary: material.name,
      secondary: material.spec || material.category || material.uom,
      code: material.code,
    }
  }

  const bom = bomOptions.find((item) => item.id === bomId)
  if (!bom) {
    return null
  }

  return {
    primary: bom.productName || bom.bomNo,
    secondary: bom.productSku || bom.status,
    code: bom.bomNo,
  }
}

export function MaterialThresholdDialog({
  open,
  onOpenChange,
  rule,
  materialOptions,
  bomOptions,
  isSubmitting,
  onSubmit,
  lockedTargetType,
  lockedMaterialId,
  lockedBomId,
}: MaterialThresholdDialogProps) {
  const { t } = useLanguage()
  const ruleTargetType = rule?.targetType
  const ruleMaterialId = rule?.materialId
  const ruleBomId = rule?.bomId
  const ruleThresholdQty = rule?.thresholdQty
  const ruleEnabled = rule?.enabled
  const ruleNotes = rule?.notes
  const [formState, dispatchFormState] = useReducer(
    materialThresholdDialogReducer,
    buildDialogState(
      {
        targetType: ruleTargetType,
        materialId: ruleMaterialId,
        bomId: ruleBomId,
        thresholdQty: ruleThresholdQty,
        enabled: ruleEnabled,
        notes: ruleNotes,
      },
      lockedTargetType,
      lockedMaterialId,
      lockedBomId
    )
  )

  useEffect(() => {
    if (!open) {
      return
    }

    dispatchFormState({
      type: 'reset',
      payload: buildDialogState(
        {
          targetType: ruleTargetType,
          materialId: ruleMaterialId,
          bomId: ruleBomId,
          thresholdQty: ruleThresholdQty,
          enabled: ruleEnabled,
          notes: ruleNotes,
        },
        lockedTargetType,
        lockedMaterialId,
        lockedBomId
      ),
    })
  }, [
    open,
    rule?.id,
    ruleTargetType,
    ruleMaterialId,
    ruleBomId,
    ruleThresholdQty,
    ruleEnabled,
    ruleNotes,
    lockedTargetType,
    lockedMaterialId,
    lockedBomId,
  ])

  const effectiveTargetType = lockedTargetType ?? formState.targetType
  const effectiveMaterialId = lockedMaterialId ?? formState.materialId
  const effectiveBomId = lockedBomId ?? formState.bomId
  const targetContextLocked = Boolean(
    lockedTargetType || lockedMaterialId || lockedBomId
  )
  const currentTarget = resolveDialogTargetSummary(
    effectiveTargetType,
    effectiveMaterialId,
    effectiveBomId,
    materialOptions,
    bomOptions
  )
  const targetModeTitle =
    effectiveTargetType === 'MATERIAL'
      ? t('warehouseConfig.materialThresholds.dialog.targetModeTitleMaterial')
      : t('warehouseConfig.materialThresholds.dialog.targetModeTitleBom')
  const targetModeDescription =
    effectiveTargetType === 'MATERIAL'
      ? t(
          'warehouseConfig.materialThresholds.dialog.targetModeDescriptionMaterial'
        )
      : t('warehouseConfig.materialThresholds.dialog.targetModeDescriptionBom')
  const thresholdFieldLabel =
    effectiveTargetType === 'MATERIAL'
      ? t('warehouseConfig.materialThresholds.dialog.thresholdLabelMaterial')
      : t('warehouseConfig.materialThresholds.dialog.thresholdLabelBom')
  const thresholdPlaceholder =
    effectiveTargetType === 'MATERIAL'
      ? t(
          'warehouseConfig.materialThresholds.dialog.thresholdPlaceholderMaterial'
        )
      : t('warehouseConfig.materialThresholds.dialog.thresholdPlaceholderBom')
  const thresholdHint =
    effectiveTargetType === 'MATERIAL'
      ? t('warehouseConfig.materialThresholds.dialog.thresholdHintMaterial')
      : t('warehouseConfig.materialThresholds.dialog.thresholdHintBom')

  const handleSave = async () => {
    const thresholdQty = Number(formState.thresholdQty)
    if (!Number.isFinite(thresholdQty) || thresholdQty < 0) {
      toast.error(
        t('warehouseConfig.materialThresholds.toast.invalidThreshold')
      )
      return
    }

    if (effectiveTargetType === 'MATERIAL' && !effectiveMaterialId) {
      toast.error(t('warehouseConfig.materialThresholds.toast.selectMaterial'))
      return
    }

    if (effectiveTargetType === 'BOM' && !effectiveBomId) {
      toast.error(t('warehouseConfig.materialThresholds.toast.selectBom'))
      return
    }

    await onSubmit({
      targetType: effectiveTargetType,
      materialId:
        effectiveTargetType === 'MATERIAL' ? effectiveMaterialId : undefined,
      bomId: effectiveTargetType === 'BOM' ? effectiveBomId : undefined,
      thresholdQty,
      enabled: formState.enabled,
      notes: formState.notes.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] overflow-hidden rounded-[32px] border-none p-0 shadow-2xl sm:max-w-[860px]'>
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
        <div className='relative p-6 md:p-8'>
          <DialogHeader className='mb-6 text-left'>
            <DialogTitle className='text-lg font-black tracking-tighter uppercase italic md:text-xl'>
              {rule
                ? t('warehouseConfig.materialThresholds.dialog.editTitle')
                : t('warehouseConfig.materialThresholds.dialog.createTitle')}
            </DialogTitle>
            <DialogDescription className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              {t('warehouseConfig.materialThresholds.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-6'>
            <MaterialThresholdTargetPicker
              targetType={effectiveTargetType}
              onTargetTypeChange={(targetType) =>
                dispatchFormState({
                  type: 'setTargetType',
                  payload: targetType,
                })
              }
              materialId={effectiveMaterialId}
              bomId={effectiveBomId}
              onMaterialIdChange={(materialId) =>
                dispatchFormState({
                  type: 'setMaterialId',
                  payload: materialId,
                })
              }
              onBomIdChange={(bomId) =>
                dispatchFormState({ type: 'setBomId', payload: bomId })
              }
              materialOptions={materialOptions}
              bomOptions={bomOptions}
              disabled={isSubmitting}
              disableTargetTypeChange={targetContextLocked}
              disableTargetSelection={targetContextLocked}
            />

            <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/10 p-5'>
              <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                <div className='space-y-2'>
                  <p className='text-sm font-black tracking-tighter text-foreground uppercase italic'>
                    {targetModeTitle}
                  </p>
                  <p className='max-w-2xl text-[11px] leading-5 font-bold text-muted-foreground/80'>
                    {targetModeDescription}
                  </p>
                </div>

                <div className='min-w-[220px] rounded-2xl bg-background/80 px-4 py-3 shadow-inner'>
                  <div className='text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t(
                      'warehouseConfig.materialThresholds.dialog.currentTargetLabel'
                    )}
                  </div>
                  <div className='mt-2 text-sm font-black tracking-tighter'>
                    {currentTarget?.primary || '--'}
                  </div>
                  <div className='mt-1 font-mono text-[8px] text-muted-foreground/60'>
                    {currentTarget?.code || '--'}
                  </div>
                  {currentTarget?.secondary ? (
                    <div className='mt-2 text-[9px] font-bold tracking-widest text-muted-foreground/60 uppercase'>
                      {currentTarget.secondary}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-[1fr_160px]'>
              <div className='space-y-2'>
                <Label className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {thresholdFieldLabel}
                </Label>
                <Input
                  type='number'
                  min='0'
                  step='0.01'
                  value={formState.thresholdQty}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    dispatchFormState({
                      type: 'setThresholdQty',
                      payload: event.target.value,
                    })
                  }
                  placeholder={thresholdPlaceholder}
                  className='h-12 rounded-2xl border-none bg-muted/50 px-4 font-mono text-sm font-black shadow-inner focus-visible:ring-primary/20'
                />
                <p className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                  {thresholdHint}
                </p>
              </div>

              <div className='space-y-2'>
                <Label className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {t('warehouseConfig.materialThresholds.dialog.enabledLabel')}
                </Label>
                <div className='flex h-12 items-center justify-between rounded-2xl bg-muted/50 px-4 shadow-inner'>
                  <span className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                    {formState.enabled
                      ? t('warehouseConfig.materialThresholds.card.enabled')
                      : t('warehouseConfig.materialThresholds.card.disabled')}
                  </span>
                  <Switch
                    checked={formState.enabled}
                    disabled={isSubmitting}
                    onCheckedChange={(enabled) =>
                      dispatchFormState({
                        type: 'setEnabled',
                        payload: enabled,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className='space-y-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t('warehouseConfig.materialThresholds.dialog.notesLabel')}
              </Label>
              <Textarea
                value={formState.notes}
                disabled={isSubmitting}
                onChange={(event) =>
                  dispatchFormState({
                    type: 'setNotes',
                    payload: event.target.value,
                  })
                }
                placeholder={t(
                  'warehouseConfig.materialThresholds.dialog.notesPlaceholder'
                )}
                className='min-h-[108px] resize-none rounded-2xl border-none bg-muted/50 px-4 py-3 text-sm shadow-inner focus-visible:ring-primary/20'
              />
            </div>
          </div>
        </div>

        <DialogFooter className='flex flex-row items-center gap-3 px-6 pb-6 md:px-8 md:pb-8'>
          <Button
            type='button'
            variant='ghost'
            disabled={isSubmitting}
            className='h-11 flex-1 rounded-full text-[10px] font-black tracking-widest uppercase'
            onClick={() => onOpenChange(false)}
          >
            {t('warehouseConfig.materialThresholds.dialog.cancel')}
          </Button>
          <Button
            type='button'
            disabled={isSubmitting}
            className='h-11 flex-1 rounded-full text-[10px] font-black tracking-widest uppercase'
            onClick={() => {
              void handleSave()
            }}
          >
            {isSubmitting ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <CheckCircle2 className='mr-2 size-4' />
            )}
            {t('warehouseConfig.materialThresholds.dialog.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
