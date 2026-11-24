import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Layers3, Loader2, Plus, SquarePen } from 'lucide-react'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import {
  QUALITY_INSPECTION_STAGES_QUERY_KEY,
  useQualityInspectionStages,
} from '../hooks/use-quality-inspection-stages'
import {
  saveQualityInspectionStage,
  type QualityInspectionStage,
} from '../services/quality-inspection-stage-catalog-service'

interface QualityInspectionStageManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function createEmptyQualityInspectionStageForm() {
  return { name: '', description: '', sortOrder: '10', active: true }
}

export function QualityInspectionStageManagementDialog({
  open,
  onOpenChange,
}: QualityInspectionStageManagementDialogProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { allowsAction, isChecking } = usePermissionActions()
  const canManage = !isChecking && allowsAction('perm_manage')
  const stagesQuery = useQualityInspectionStages(open)
  const [editingStage, setEditingStage] =
    useState<QualityInspectionStage | null>(null)
  const [stageForm, setStageForm] = useState(
    createEmptyQualityInspectionStageForm
  )
  const stageFormRef = useRef<HTMLFormElement>(null)
  const stageSaveMutation = useMutation({
    mutationFn: () =>
      saveQualityInspectionStage(editingStage?.id, {
        name: stageForm.name.trim(),
        description: stageForm.description.trim(),
        sortOrder: Number(stageForm.sortOrder),
        active: stageForm.active,
        version: editingStage?.version,
      }),
  })

  function startCreatingQualityInspectionStage() {
    setEditingStage(null)
    setStageForm(createEmptyQualityInspectionStageForm())
  }

  function startEditingQualityInspectionStage(stage: QualityInspectionStage) {
    setEditingStage(stage)
    setStageForm({
      name: stage.name,
      description: stage.description,
      sortOrder: String(stage.sortOrder),
      active: stage.active,
    })
    if (window.matchMedia?.('(max-width: 1023px)').matches) {
      stageFormRef.current?.scrollIntoView?.({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  async function submitQualityInspectionStageForm(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    if (!canManage || stageSaveMutation.isPending) return
    if (
      !stageForm.name.trim() ||
      !stageForm.sortOrder.trim() ||
      !Number.isInteger(Number(stageForm.sortOrder)) ||
      Number(stageForm.sortOrder) < 0 ||
      Number(stageForm.sortOrder) > 1000000
    ) {
      toast.error(t('quality.standards.inspectionStages.validation'))
      return
    }
    try {
      await stageSaveMutation.mutateAsync()
      await queryClient.invalidateQueries({
        queryKey: QUALITY_INSPECTION_STAGES_QUERY_KEY,
      })
      startCreatingQualityInspectionStage()
      toast.success(t('quality.standards.inspectionStages.saved'))
    } catch (error) {
      handleServerError(error)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!stageSaveMutation.isPending) onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        size='6xl'
        data-mobile-floating-surface-layout='column'
        className='flex max-h-[85dvh] flex-col overflow-hidden rounded-3xl p-0'
      >
        <DialogHeader className='shrink-0 border-b p-5 pr-12'>
          <DialogTitle className='flex items-center gap-2'>
            <Layers3 className='size-5 text-primary' />
            {t('quality.standards.inspectionStages.title')}
          </DialogTitle>
          <DialogDescription className='text-[13px] leading-5'>
            {t('quality.standards.inspectionStages.description')}
          </DialogDescription>
        </DialogHeader>
        <div
          data-mobile-floating-surface-scroll-body
          className='min-h-0 overflow-y-auto p-5'
        >
          <div className='grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,1fr)]'>
            <section
              className='min-w-0 space-y-3'
              aria-label={t('quality.standards.inspectionStages.list')}
            >
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <h2 className='text-sm leading-5 font-semibold'>
                  {t('quality.standards.inspectionStages.list')}
                </h2>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='rounded-full'
                  disabled={
                    stagesQuery.isFetching || stageSaveMutation.isPending
                  }
                  onClick={() => stagesQuery.refetch()}
                >
                  {t('quality.standards.inspectionStages.refresh')}
                </Button>
              </div>
              {stagesQuery.isLoading ? (
                <p
                  role='status'
                  className='text-xs leading-5 text-muted-foreground'
                >
                  {t('quality.standards.inspectionStages.loading')}
                </p>
              ) : null}
              {stagesQuery.isError ? (
                <p role='alert' className='text-xs leading-5 text-destructive'>
                  {t('quality.standards.inspectionStages.loadFailed')}
                </p>
              ) : null}
              {stagesQuery.isSuccess && stagesQuery.data.length === 0 ? (
                <p className='text-xs leading-5 text-muted-foreground'>
                  {t('quality.standards.inspectionStages.empty')}
                </p>
              ) : null}
              {stagesQuery.data?.map((stage) => (
                <div
                  key={stage.id}
                  className='flex items-start justify-between gap-3 rounded-2xl border p-3'
                >
                  <div className='min-w-0 space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='text-xs leading-5 text-muted-foreground'>
                        {stage.sortOrder}
                      </span>
                      <span className='control-typography break-words'>
                        {stage.name}
                      </span>
                      <Badge variant={stage.active ? 'secondary' : 'outline'}>
                        {t(
                          stage.active
                            ? 'quality.standards.inspectionStages.active'
                            : 'quality.standards.inspectionStages.inactive'
                        )}
                      </Badge>
                    </div>
                    {stage.description ? (
                      <p className='text-xs leading-5 break-words text-muted-foreground'>
                        {stage.description}
                      </p>
                    ) : null}
                  </div>
                  {canManage ? (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='rounded-full'
                      aria-label={`${t('quality.standards.inspectionStages.edit')} ${stage.name}`}
                      disabled={stageSaveMutation.isPending}
                      onClick={() => startEditingQualityInspectionStage(stage)}
                    >
                      <SquarePen className='size-3.5' />
                      {t('quality.standards.inspectionStages.edit')}
                    </Button>
                  ) : null}
                </div>
              ))}
            </section>
            {canManage ? (
              <form
                ref={stageFormRef}
                onSubmit={submitQualityInspectionStageForm}
                className='min-w-0 space-y-4 rounded-2xl border bg-muted/10 p-4'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <h2 className='text-sm leading-5 font-semibold'>
                    {t(
                      editingStage
                        ? 'quality.standards.inspectionStages.edit'
                        : 'quality.standards.inspectionStages.add'
                    )}
                  </h2>
                  {editingStage ? (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='rounded-full'
                      disabled={stageSaveMutation.isPending}
                      onClick={startCreatingQualityInspectionStage}
                    >
                      <Plus className='size-3.5' />
                      {t('quality.standards.inspectionStages.add')}
                    </Button>
                  ) : null}
                </div>
                <div className='space-y-2'>
                  <Label
                    htmlFor='quality-inspection-stage-name'
                    className='control-typography text-muted-foreground'
                  >
                    {t('quality.standards.inspectionStages.name')}
                  </Label>
                  <Input
                    id='quality-inspection-stage-name'
                    maxLength={100}
                    required
                    value={stageForm.name}
                    disabled={stageSaveMutation.isPending}
                    onChange={(event) =>
                      setStageForm({ ...stageForm, name: event.target.value })
                    }
                    placeholder={t(
                      'quality.standards.inspectionStages.namePlaceholder'
                    )}
                  />
                </div>
                <div className='space-y-2'>
                  <Label
                    htmlFor='quality-inspection-stage-sort-order'
                    className='control-typography text-muted-foreground'
                  >
                    {t('quality.standards.inspectionStages.sortOrder')}
                  </Label>
                  <Input
                    id='quality-inspection-stage-sort-order'
                    type='number'
                    min='0'
                    max='1000000'
                    step='1'
                    required
                    value={stageForm.sortOrder}
                    disabled={stageSaveMutation.isPending}
                    onChange={(event) =>
                      setStageForm({
                        ...stageForm,
                        sortOrder: event.target.value,
                      })
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label
                    htmlFor='quality-inspection-stage-description'
                    className='control-typography text-muted-foreground'
                  >
                    {t('quality.standards.inspectionStages.notes')}
                  </Label>
                  <Textarea
                    id='quality-inspection-stage-description'
                    maxLength={2000}
                    value={stageForm.description}
                    disabled={stageSaveMutation.isPending}
                    onChange={(event) =>
                      setStageForm({
                        ...stageForm,
                        description: event.target.value,
                      })
                    }
                  />
                </div>
                <div className='flex items-center gap-3'>
                  <Switch
                    id='quality-inspection-stage-active'
                    checked={stageForm.active}
                    disabled={stageSaveMutation.isPending}
                    onCheckedChange={(active) =>
                      setStageForm({ ...stageForm, active })
                    }
                  />
                  <Label
                    htmlFor='quality-inspection-stage-active'
                    className='control-typography text-muted-foreground'
                  >
                    {t('quality.standards.inspectionStages.active')}
                  </Label>
                </div>
                <p className='text-xs leading-5 text-muted-foreground'>
                  {t('quality.standards.inspectionStages.historyHint')}
                </p>
                <Button
                  type='submit'
                  disabled={
                    stageSaveMutation.isPending ||
                    stagesQuery.isError ||
                    stagesQuery.isLoading
                  }
                  className='w-full rounded-full'
                >
                  {stageSaveMutation.isPending ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : null}
                  {t('quality.standards.inspectionStages.save')}
                </Button>
              </form>
            ) : (
              <p className='text-xs leading-5 text-muted-foreground'>
                {t('quality.standards.inspectionStages.readOnly')}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
