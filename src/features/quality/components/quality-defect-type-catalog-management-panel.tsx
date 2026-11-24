import { useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, SquarePen } from 'lucide-react'
import { toast } from 'sonner'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { handleServerError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import {
  QUALITY_DEFECT_TYPES_QUERY_KEY,
  useQualityDefectTypes,
  type QualityDefectConfigurationInteractionState,
} from '../hooks/use-quality-defect-type-configuration'
import {
  saveQualityDefectType,
  type QualityDefectType,
} from '../services/quality-defect-type-catalog-and-inspection-stage-bindings-service'

function createEmptyQualityDefectTypeForm() {
  return { name: '', description: '', sortOrder: '10', active: true }
}

export function QualityDefectTypeCatalogManagementPanel({
  disabled = false,
  onInteractionStateChange,
}: {
  disabled?: boolean
  onInteractionStateChange?: (
    state: QualityDefectConfigurationInteractionState
  ) => void
}) {
  const { t } = useLanguage()
  const formId = useId()
  const queryClient = useQueryClient()
  const permissions = usePermissionActions()
  const canManage =
    !permissions.isChecking && permissions.allowsAction('perm_manage')
  const catalog = useQualityDefectTypes()
  const [editingDefectType, setEditingDefectType] =
    useState<QualityDefectType | null>(null)
  const [form, setForm] = useState(createEmptyQualityDefectTypeForm)
  const [initialForm, setInitialForm] = useState(
    createEmptyQualityDefectTypeForm
  )
  const submissionInProgress = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const saveMutation = useMutation({
    mutationFn: () =>
      saveQualityDefectType(editingDefectType?.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        sortOrder: Number(form.sortOrder),
        active: form.active,
        version: editingDefectType?.version,
      }),
  })
  const hasUnsavedChanges = JSON.stringify(form) !== JSON.stringify(initialForm)
  const controlsDisabled = disabled || isSaving
  const formDisabled = controlsDisabled || catalog.isPending || catalog.isError

  useEffect(() => {
    onInteractionStateChange?.({ hasUnsavedChanges, isSaving })
  }, [hasUnsavedChanges, onInteractionStateChange, isSaving])

  function initializeQualityDefectTypeEditor(
    defectType: QualityDefectType | null
  ) {
    const nextForm = defectType
      ? {
          name: defectType.name,
          description: defectType.description,
          sortOrder: String(defectType.sortOrder),
          active: defectType.active,
        }
      : createEmptyQualityDefectTypeForm()
    setEditingDefectType(defectType)
    setForm(nextForm)
    setInitialForm(nextForm)
    saveMutation.reset()
  }

  async function changeQualityDefectTypeEditor(
    defectType: QualityDefectType | null
  ) {
    if (
      controlsDisabled ||
      (hasUnsavedChanges &&
        !(await requestApplicationConfirmation(
          t('quality.defectConfiguration.discardChanges')
        )))
    )
      return
    initializeQualityDefectTypeEditor(defectType)
  }

  async function reloadQualityDefectTypeCatalog() {
    if (
      controlsDisabled ||
      (hasUnsavedChanges &&
        !(await requestApplicationConfirmation(
          t('quality.defectConfiguration.discardChanges')
        )))
    )
      return
    const result = await catalog.refetch()
    if (!result.isError) initializeQualityDefectTypeEditor(null)
  }

  async function submitQualityDefectTypeForm(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    if (
      !canManage ||
      formDisabled ||
      submissionInProgress.current ||
      !hasUnsavedChanges
    )
      return
    if (
      !form.name.trim() ||
      [...form.name.trim()].length > 100 ||
      [...form.description].length > 2000 ||
      !form.sortOrder.trim() ||
      !Number.isInteger(Number(form.sortOrder)) ||
      Number(form.sortOrder) < 0 ||
      Number(form.sortOrder) > 1000000
    ) {
      toast.error(t('quality.defectConfiguration.validation'))
      return
    }
    submissionInProgress.current = true
    setIsSaving(true)
    try {
      const saved = await saveMutation.mutateAsync()
      await queryClient.invalidateQueries({
        queryKey: QUALITY_DEFECT_TYPES_QUERY_KEY,
      })
      initializeQualityDefectTypeEditor(saved)
      toast.success(t('quality.defectConfiguration.saved'))
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
      aria-label={t('quality.defectConfiguration.catalogTitle')}
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h2 className='text-sm font-semibold'>
          {t('quality.defectConfiguration.catalogTitle')}
        </h2>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='rounded-full'
          disabled={controlsDisabled || catalog.isFetching}
          onClick={() => void reloadQualityDefectTypeCatalog()}
        >
          {t('quality.defectConfiguration.refresh')}
        </Button>
      </div>
      <p className='text-muted-foreground'>
        {t('quality.defectConfiguration.catalogDescription')}
      </p>
      {catalog.isPending ? (
        <p role='status'>{t('quality.defectConfiguration.loading')}</p>
      ) : null}
      {catalog.isError ? (
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
            disabled={controlsDisabled || catalog.isFetching}
            onClick={() => void reloadQualityDefectTypeCatalog()}
          >
            {t('quality.defectConfiguration.retry')}
          </Button>
        </div>
      ) : null}
      {!catalog.isPending && !catalog.isError && catalog.data?.length === 0 ? (
        <p className='text-muted-foreground'>
          {t('quality.defectConfiguration.empty')}
        </p>
      ) : null}
      <div className='max-h-72 space-y-2 overflow-y-auto'>
        {catalog.data?.map((defectType) => (
          <div
            key={defectType.id}
            className='flex items-start justify-between gap-3 rounded-xl border p-3'
          >
            <div className='min-w-0 space-y-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='font-medium break-words'>
                  {defectType.name}
                </span>
                {!defectType.active ? (
                  <Badge variant='secondary'>
                    {t('quality.defectConfiguration.inactive')}
                  </Badge>
                ) : null}
              </div>
              {defectType.description ? (
                <p className='break-words text-muted-foreground'>
                  {defectType.description}
                </p>
              ) : null}
            </div>
            {canManage ? (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-8 rounded-full'
                disabled={controlsDisabled}
                aria-label={`${t('quality.defectConfiguration.edit')} ${defectType.name}`}
                onClick={() => void changeQualityDefectTypeEditor(defectType)}
              >
                <SquarePen className='size-4' />
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      {canManage ? (
        <form
          onSubmit={(event) => void submitQualityDefectTypeForm(event)}
          className='space-y-3 border-t pt-4'
        >
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h3 className='font-semibold'>
              {t(
                editingDefectType
                  ? 'quality.defectConfiguration.edit'
                  : 'quality.defectConfiguration.add'
              )}
            </h3>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='rounded-full'
              disabled={controlsDisabled}
              onClick={() => void changeQualityDefectTypeEditor(null)}
            >
              <Plus className='size-4' />
              {t('quality.defectConfiguration.add')}
            </Button>
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor={`${formId}-name`}>
              {t('quality.defectConfiguration.name')}
            </Label>
            <Input
              id={`${formId}-name`}
              value={form.name}
              disabled={formDisabled}
              maxLength={100}
              placeholder={t('quality.defectConfiguration.namePlaceholder')}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor={`${formId}-description`}>
              {t('quality.defectConfiguration.notes')}
            </Label>
            <Textarea
              id={`${formId}-description`}
              value={form.description}
              disabled={formDisabled}
              maxLength={2000}
              rows={2}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
            />
          </div>
          <div className='flex flex-wrap items-end gap-4'>
            <div className='min-w-0 flex-1 space-y-1.5'>
              <Label htmlFor={`${formId}-sort`}>
                {t('quality.defectConfiguration.sortOrder')}
              </Label>
              <Input
                id={`${formId}-sort`}
                type='number'
                min={0}
                max={1000000}
                step={1}
                value={form.sortOrder}
                disabled={formDisabled}
                onChange={(event) =>
                  setForm({ ...form, sortOrder: event.target.value })
                }
              />
            </div>
            <div className='flex h-9 items-center gap-2'>
              <Switch
                id={`${formId}-active`}
                checked={form.active}
                disabled={formDisabled}
                onCheckedChange={(active) => setForm({ ...form, active })}
              />
              <Label htmlFor={`${formId}-active`}>
                {t('quality.defectConfiguration.active')}
              </Label>
            </div>
          </div>
          {hasUnsavedChanges ? (
            <p role='status' className='text-muted-foreground'>
              {t('quality.defectConfiguration.dirty')}
            </p>
          ) : null}
          <Button
            type='submit'
            className='rounded-full'
            disabled={formDisabled || !hasUnsavedChanges}
          >
            {saveMutation.isPending ? (
              <Loader2 className='size-4 animate-spin' />
            ) : null}
            {t(
              saveMutation.isPending
                ? 'quality.defectConfiguration.saving'
                : 'quality.defectConfiguration.save'
            )}
          </Button>
        </form>
      ) : (
        <p className='text-muted-foreground'>
          {t('quality.defectConfiguration.readOnly')}
        </p>
      )}
    </section>
  )
}
