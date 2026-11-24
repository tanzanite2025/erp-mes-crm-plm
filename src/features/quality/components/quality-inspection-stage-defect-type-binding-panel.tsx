import { useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { handleServerError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import {
  QUALITY_INSPECTION_STAGE_DEFECT_BINDINGS_QUERY_KEY,
  useQualityDefectTypes,
  useQualityInspectionStageDefectTypeBindings,
  type QualityDefectConfigurationInteractionState,
} from '../hooks/use-quality-defect-type-configuration'
import {
  QUALITY_INSPECTION_STAGES_QUERY_KEY,
  useQualityInspectionStages,
} from '../hooks/use-quality-inspection-stages'
import {
  replaceQualityInspectionStageDefectTypeBindings,
  type QualityInspectionStageDefectTypeBindings,
} from '../services/quality-defect-type-catalog-and-inspection-stage-bindings-service'

export function QualityInspectionStageDefectTypeBindingPanel({
  disabled = false,
  onInteractionStateChange,
}: {
  disabled?: boolean
  onInteractionStateChange?: (
    state: QualityDefectConfigurationInteractionState
  ) => void
}) {
  const { t } = useLanguage()
  const selectionId = useId()
  const queryClient = useQueryClient()
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  const permissions = usePermissionActions()
  const canManage =
    !permissions.isChecking && permissions.allowsAction('perm_manage')
  const stages = useQualityInspectionStages()
  const catalog = useQualityDefectTypes()
  const [selectedStageId, setSelectedStageId] = useState('')
  const [draft, setDraft] =
    useState<QualityInspectionStageDefectTypeBindings | null>(null)
  const bindings = useQualityInspectionStageDefectTypeBindings(selectedStageId)
  const currentSelection = draft ?? bindings.data
  const selectedIDs = currentSelection?.defectTypeIds ?? []
  const selectedStage = stages.data?.find(
    (stage) => stage.id === selectedStageId
  )
  const hasUnsavedChanges = draft !== null
  const submissionInProgress = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const saveMutation = useMutation({
    mutationFn: replaceQualityInspectionStageDefectTypeBindings,
  })
  const controlsDisabled = disabled || isSaving
  const hasLoadError =
    stages.isError ||
    catalog.isError ||
    (Boolean(selectedStageId) && bindings.isError)
  const isLoading =
    stages.isPending ||
    catalog.isPending ||
    (Boolean(selectedStageId) && bindings.isPending)
  const hasUnknownBindings = selectedIDs.some(
    (id) => !catalog.data?.some((defectType) => defectType.id === id)
  )
  const canEdit =
    canManage &&
    selectedStage?.active &&
    !controlsDisabled &&
    !hasLoadError &&
    !isLoading &&
    Boolean(currentSelection) &&
    !hasUnknownBindings

  useEffect(() => {
    onInteractionStateChange?.({ hasUnsavedChanges, isSaving })
  }, [hasUnsavedChanges, onInteractionStateChange, isSaving])

  async function changeSelectedQualityInspectionStage(nextStageId: string) {
    if (
      controlsDisabled ||
      nextStageId === selectedStageId ||
      (hasUnsavedChanges &&
        !(await requestApplicationConfirmation(
          t('quality.defectConfiguration.discardChanges')
        )))
    )
      return
    setDraft(null)
    setSelectedStageId(nextStageId)
    saveMutation.reset()
  }

  function toggleQualityInspectionStageDefectType(
    defectTypeId: string,
    checked: boolean
  ) {
    if (!canEdit || !currentSelection) return
    const nextIDs = checked
      ? [...selectedIDs, defectTypeId]
      : selectedIDs.filter((id) => id !== defectTypeId)
    // After the first edit, keep both the set and its original version frozen.
    // Background refreshes must not turn a stale draft into an authorized overwrite.
    const nextDraft = {
      ...currentSelection,
      defectTypeIds: [...new Set(nextIDs)].sort(),
    }
    const originalIDs = bindings.data?.defectTypeIds ?? []
    const matchesOriginal =
      nextDraft.version === bindings.data?.version &&
      nextDraft.defectTypeIds.length === originalIDs.length &&
      nextDraft.defectTypeIds.every((id) => originalIDs.includes(id))
    setDraft(matchesOriginal ? null : nextDraft)
  }

  async function reloadQualityInspectionStageDefectTypeBindings() {
    if (
      controlsDisabled ||
      (hasUnsavedChanges &&
        !(await requestApplicationConfirmation(
          t('quality.defectConfiguration.discardChanges')
        )))
    )
      return
    const results = await Promise.all([
      stages.refetch(),
      catalog.refetch(),
      ...(selectedStageId ? [bindings.refetch()] : []),
    ])
    if (results.every((result) => !result.isError)) {
      setDraft(null)
      saveMutation.reset()
    }
  }

  async function saveQualityInspectionStageDefectTypeSelection() {
    if (!canEdit || !draft || submissionInProgress.current) return
    submissionInProgress.current = true
    setIsSaving(true)
    try {
      const saved = await saveMutation.mutateAsync(draft)
      queryClient.setQueryData(
        [
          ...QUALITY_INSPECTION_STAGE_DEFECT_BINDINGS_QUERY_KEY,
          actorId,
          saved.inspectionStageId,
        ],
        saved
      )
      setDraft(null)
      await queryClient.invalidateQueries({
        queryKey: QUALITY_INSPECTION_STAGES_QUERY_KEY,
      })
      toast.success(t('quality.defectConfiguration.bindingsSaved'))
    } catch (error) {
      handleServerError(error)
    } finally {
      submissionInProgress.current = false
      setIsSaving(false)
    }
  }

  return (
    <section
      className='min-w-0 space-y-4 rounded-2xl border p-4 text-[13px] leading-5'
      aria-label={t('quality.defectConfiguration.bindingsTitle')}
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h2 className='text-sm font-semibold'>
          {t('quality.defectConfiguration.bindingsTitle')}
        </h2>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-full'
          disabled={
            controlsDisabled ||
            stages.isFetching ||
            catalog.isFetching ||
            bindings.isFetching
          }
          onClick={() => void reloadQualityInspectionStageDefectTypeBindings()}
        >
          {t('quality.defectConfiguration.refresh')}
        </Button>
      </div>
      <p className='text-muted-foreground'>
        {t('quality.defectConfiguration.bindingsDescription')}
      </p>
      <div className='space-y-1.5'>
        <Label htmlFor={`${selectionId}-station`}>
          {t('quality.defectConfiguration.station')}
        </Label>
        <Select
          value={selectedStageId}
          disabled={controlsDisabled || stages.isPending || stages.isError}
          onValueChange={(id) => void changeSelectedQualityInspectionStage(id)}
        >
          <SelectTrigger id={`${selectionId}-station`} className='w-full'>
            <SelectValue
              placeholder={t('quality.defectConfiguration.chooseStation')}
            />
          </SelectTrigger>
          <SelectContent>
            {stages.data?.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                {stage.name}
                {!stage.active
                  ? ` · ${t('quality.defectConfiguration.inactive')}`
                  : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <p role='status'>{t('quality.defectConfiguration.loading')}</p>
      ) : null}
      {hasLoadError ? (
        <div
          role='alert'
          className='flex flex-wrap items-center gap-2 text-destructive'
        >
          {t('quality.defectConfiguration.loadFailed')}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='rounded-full'
            disabled={controlsDisabled}
            onClick={() =>
              void reloadQualityInspectionStageDefectTypeBindings()
            }
          >
            {t('quality.defectConfiguration.retry')}
          </Button>
        </div>
      ) : null}
      {stages.data?.length === 0 ? (
        <p className='text-muted-foreground'>
          {t('quality.defectConfiguration.noStations')}
        </p>
      ) : null}
      {selectedStage && !selectedStage.active ? (
        <p className='text-muted-foreground'>
          {t('quality.defectConfiguration.stationInactive')}
        </p>
      ) : null}
      {selectedStageId && !isLoading && !hasLoadError ? (
        <>
          {hasUnknownBindings ? (
            <p role='alert' className='text-destructive'>
              {t('quality.defectConfiguration.unavailableBinding')}
            </p>
          ) : null}
          {selectedIDs.length === 0 ? (
            <p className='text-muted-foreground'>
              {t('quality.defectConfiguration.noBindings')}
            </p>
          ) : null}
          <div className='grid max-h-96 gap-2 overflow-y-auto sm:grid-cols-2'>
            {catalog.data?.map((defectType) => {
              const checked = selectedIDs.includes(defectType.id)
              const wasBound = bindings.data?.defectTypeIds.includes(
                defectType.id
              )
              return (
                <label
                  key={defectType.id}
                  className='flex min-w-0 items-start gap-2 rounded-xl border p-3'
                >
                  <Checkbox
                    className='mt-0.5'
                    checked={checked}
                    disabled={!canEdit || (!defectType.active && !wasBound)}
                    onCheckedChange={(value) =>
                      toggleQualityInspectionStageDefectType(
                        defectType.id,
                        value === true
                      )
                    }
                  />
                  <span className='min-w-0 space-y-1'>
                    <span className='block font-medium break-words'>
                      {defectType.name}
                    </span>
                    {defectType.description ? (
                      <span className='block break-words text-muted-foreground'>
                        {defectType.description}
                      </span>
                    ) : null}
                    {!defectType.active ? (
                      <Badge variant='secondary'>
                        {t('quality.defectConfiguration.inactive')}
                      </Badge>
                    ) : null}
                  </span>
                </label>
              )
            })}
          </div>
          {catalog.data?.some((defectType) => !defectType.active) ? (
            <p className='text-muted-foreground'>
              {t('quality.defectConfiguration.inactiveBinding')}
            </p>
          ) : null}
        </>
      ) : null}
      {!canManage ? (
        <p className='text-muted-foreground'>
          {t('quality.defectConfiguration.readOnly')}
        </p>
      ) : null}
      {hasUnsavedChanges ? (
        <p role='status' className='text-muted-foreground'>
          {t('quality.defectConfiguration.dirty')}
        </p>
      ) : null}
      {canManage ? (
        <Button
          type='button'
          className='rounded-full'
          disabled={!canEdit || !hasUnsavedChanges}
          onClick={() => void saveQualityInspectionStageDefectTypeSelection()}
        >
          {saveMutation.isPending ? (
            <Loader2 className='size-4 animate-spin' />
          ) : null}
          {t(
            saveMutation.isPending
              ? 'quality.defectConfiguration.saving'
              : 'quality.defectConfiguration.saveBindings'
          )}
        </Button>
      ) : null}
    </section>
  )
}
