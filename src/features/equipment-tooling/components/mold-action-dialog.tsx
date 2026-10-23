'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { Save, FileText, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { auditUtils } from '@/lib/audit-utils'
import { type DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { UdsHealthProgress } from '@/components/uds/uds-health-progress'
import { canOpenRouteEntry } from '@/features/authz/guards/route-entry-access'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import {
  createMoldDraft,
  createMoldSchema,
  type Mold,
  type MoldDrawing,
  type MoldFormInput,
  type MoldFormOutput,
} from '../data/schema'
import { useMoldDrawingsQuery } from '../hooks/use-mold-drawings-query'
import { AssetService } from '../services/asset-service'
import { MoldCoreService } from '../services/mold-core-service'
import { ImageUpload } from './image-upload'
import { MoldMasterLibraryGroupNameFormField } from './mold-master-library-group-name-form-field'

interface MoldActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (
    data: Mold,
    isPatch?: boolean,
    delta?: DeltaSet
  ) => void | Promise<void>
  editData?: Mold | null
  initialGroupName?: string
  requireGroupName?: boolean
}

const moldMasterLibraryInputClassName =
  'h-10 w-full rounded-xl bg-muted/40 text-[13px] font-normal placeholder:text-[13px] placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground placeholder:normal-case placeholder:opacity-100 md:text-[13px]'

export function MoldActionDialog({
  open,
  onOpenChange,
  onConfirm,
  editData,
  initialGroupName,
  requireGroupName = false,
}: MoldActionDialogProps) {
  const { t, locale } = useLanguage()
  const isChineseLocale = locale.startsWith('zh')
  const { allowsAction } = usePermissionActions()
  const user = useAuthStore((state) => state.user)
  const canOpenDrawings = canOpenRouteEntry(user, '/equipment-tooling/drawings')
  const [isSavingMold, setIsSavingMold] = useState(false)
  const [isUploadingMoldImage, setIsUploadingMoldImage] = useState(false)
  const moldSubmissionLock = useRef(false)
  const isBusy = isSavingMold || isUploadingMoldImage
  const moldFormSchema = useMemo(() => createMoldSchema(t), [t])
  const defaultDraft = useMemo(
    () => createMoldDraft(editData ?? { groupName: initialGroupName ?? '' }),
    [editData, initialGroupName]
  )

  const { commit, deltaProxy, reset } = useDeltaTracker<Mold>(
    defaultDraft,
    open
  )
  const isEdit = !!editData

  const form = useForm<MoldFormInput, unknown, MoldFormOutput>({
    resolver: zodResolver(moldFormSchema),
    defaultValues: defaultDraft,
  })
  const moldDrawingsQuery = useMoldDrawingsQuery(open, editData?.sn)
  const linkedDrawings: MoldDrawing[] = moldDrawingsQuery.data ?? []

  const watchedMax = useWatch({ control: form.control, name: 'maxCycles' }) ?? 0
  const watchedCurrent =
    useWatch({ control: form.control, name: 'currentCycles' }) ?? 0
  const healthPercent = AssetService.previewHealthScore(
    watchedCurrent,
    watchedMax
  )

  const handleOpenChange = (nextOpen: boolean) => {
    if (isBusy || moldSubmissionLock.current) return
    onOpenChange(nextOpen)
  }

  const collectTrackedDelta = (data: MoldFormOutput) => {
    Object.assign(deltaProxy, data)
    return commit()
  }

  useEffect(() => {
    if (!open) return

    if (editData) {
      form.reset(editData)
      reset(editData)
      return
    }

    const draft = createMoldDraft({ groupName: initialGroupName ?? '' })
    form.reset(draft)
    reset(draft)
  }, [editData, form, open, reset, initialGroupName])

  const onSubmit = async (data: MoldFormOutput) => {
    if (
      !allowsAction('action_equipment_mold_manage') ||
      isBusy ||
      moldSubmissionLock.current
    )
      return

    data = { ...data, groupName: data.groupName?.trim() ?? '' }
    if (requireGroupName && !data.groupName) {
      form.setError('groupName', {
        message: isChineseLocale
          ? '请填写或选择分组名称，才能从产品中选用。'
          : 'Enter or choose a group name to use this mold group for a product.',
      })
      return
    }

    moldSubmissionLock.current = true
    setIsSavingMold(true)
    try {
      const isDuplicate = await MoldCoreService.isSnDuplicate(
        data.sn,
        editData?.id
      )
      if (isDuplicate) {
        toast.error(
          t('equipmentTooling.molds.dialog.validation.duplicateSn', {
            sn: data.sn,
          })
        )
        return
      }

      const delta = collectTrackedDelta(data)
      const isDirty = Object.keys(delta).length > 0

      if (isEdit && !isDirty) {
        onOpenChange(false)
        return
      }

      if (isEdit && editData?.version === undefined) {
        throw new Error(
          '[CRITICAL] 模具编辑模式下版本号(version)缺失，无法执行 SDRTS 安全 Patch。'
        )
      }

      const stampedData = auditUtils.stamp(
        data,
        editData ? 'update' : 'create'
      ) as Mold

      // SDRTS: 发送 Patch 意图或全量数据
      await onConfirm(stampedData, isEdit, isEdit ? delta : undefined)
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isChineseLocale
            ? '模具保存失败，请重试'
            : 'Cannot save mold. Please retry.'
      )
    } finally {
      moldSubmissionLock.current = false
      setIsSavingMold(false)
    }
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={handleOpenChange}
      title={
        editData
          ? t('equipmentTooling.molds.dialog.title.edit')
          : t('equipmentTooling.molds.dialog.title.create')
      }
      description={
        <>
          {t('equipmentTooling.molds.dialog.description.prefix')}{' '}
          <span className='font-black tracking-widest text-primary uppercase'>
            {t('equipmentTooling.molds.dialog.description.alertCode')}
          </span>{' '}
          {t('equipmentTooling.molds.dialog.description.suffix')}
        </>
      }
      contentDecoration={
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
      }
      contentClassName='mold-master-library-floating-surface flex h-[85vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl p-0 bg-background sm:max-w-4xl'
      headerClassName='shrink-0 border-b px-6 py-4 pr-12 text-start'
      bodyClassName='min-h-0 flex-1 overflow-y-auto p-6'
      footerClassName='shrink-0 border-t px-6 py-4'
      titleClassName='text-base font-semibold normal-case tracking-normal'
      descriptionClassName='text-xs leading-5 font-normal opacity-100 normal-case tracking-normal'
      footer={
        <>
          <Button
            type='button'
            variant='ghost'
            disabled={isBusy}
            className='h-10 rounded-full px-6 text-[13px]'
            onClick={() => handleOpenChange(false)}
          >
            {t('equipmentTooling.molds.dialog.actions.cancel')}
          </Button>
          <Button
            type='button'
            disabled={isBusy}
            onClick={form.handleSubmit(onSubmit)}
            className='h-10 gap-2 rounded-full bg-blue-600 px-6 text-[13px] text-white hover:bg-blue-700'
          >
            <Save className='size-3.5' />{' '}
            {isBusy
              ? isChineseLocale
                ? '正在处理…'
                : 'Saving…'
              : t('equipmentTooling.molds.dialog.actions.save')}
          </Button>
        </>
      }
    >
      <UdsHealthProgress
        className='mb-6'
        label={t('equipmentTooling.molds.dialog.healthIndex')}
        value={healthPercent}
        footer={
          <>
            <div className='flex gap-3'>
              <span className='text-[8px] font-black text-muted-foreground/30 uppercase'>
                {t('equipmentTooling.molds.dialog.metrics.current', {
                  value: watchedCurrent,
                })}
              </span>
              <span className='text-[8px] font-black text-muted-foreground/30 uppercase'>
                {t('equipmentTooling.molds.dialog.metrics.total', {
                  value: form.getValues('totalLifeCycles') || 0,
                })}
              </span>
            </div>
            <Badge
              variant='outline'
              className='h-4 border-none bg-primary/5 text-[8px] font-black whitespace-nowrap text-primary uppercase'
            >
              {t('equipmentTooling.molds.dialog.realtimeSync')}
            </Badge>
          </>
        }
      />

      <Form {...form}>
        <form
          onSubmit={(event) => {
            event.stopPropagation()
            void form.handleSubmit(onSubmit)(event)
          }}
        >
          <fieldset disabled={isBusy} className='min-w-0 space-y-5'>
            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='sn'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel className='text-xs font-medium text-foreground'>
                      {t('equipmentTooling.molds.dialog.fields.sn')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        className={moldMasterLibraryInputClassName}
                        placeholder={t(
                          'equipmentTooling.molds.dialog.placeholders.sn'
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel className='text-xs font-medium text-foreground'>
                      {t('equipmentTooling.molds.dialog.fields.name')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        className={moldMasterLibraryInputClassName}
                        placeholder={t(
                          'equipmentTooling.molds.dialog.placeholders.name'
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <MoldMasterLibraryGroupNameFormField
              key={editData?.id ?? 'new-mold'}
              control={form.control}
              open={open}
              inputClassName={moldMasterLibraryInputClassName}
            />

            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='location'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel className='text-xs font-medium text-foreground'>
                      {t('equipmentTooling.molds.dialog.fields.location')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        className={moldMasterLibraryInputClassName}
                        placeholder={t(
                          'equipmentTooling.molds.dialog.placeholders.location'
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='currentCycles'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel className='text-xs font-medium text-foreground'>
                      {t('equipmentTooling.molds.dialog.fields.currentCycles')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        className={moldMasterLibraryInputClassName}
                        placeholder={t(
                          'equipmentTooling.molds.dialog.placeholders.currentCycles'
                        )}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value, 10) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='maxCycles'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel className='text-xs font-medium text-foreground'>
                      {t('equipmentTooling.molds.dialog.fields.maxCycles')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        className={moldMasterLibraryInputClassName}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value, 10) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='maintenanceThreshold'
                render={({ field }) => (
                  <FormItem className='space-y-3'>
                    <FormLabel className='text-xs font-medium text-foreground'>
                      {t(
                        'equipmentTooling.molds.dialog.fields.maintenanceThreshold'
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        className={moldMasterLibraryInputClassName}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value, 10) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='imageUrl'
              render={({ field }) => (
                <FormItem className='space-y-3'>
                  <Label className='text-xs font-medium text-foreground'>
                    {t('equipmentTooling.molds.dialog.fields.image')}
                  </Label>
                  <FormControl>
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      onUploadingChange={setIsUploadingMoldImage}
                      label={t('equipmentTooling.molds.dialog.labels.image')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {editData && (
              <div className='space-y-3 rounded-[24px] border border-dashed bg-primary/2 p-4'>
                <div className='flex flex-wrap items-center justify-between gap-2 px-1'>
                  <span className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                    <FileText className='size-3' />{' '}
                    {t('equipmentTooling.molds.dialog.labels.linkedDrawings', {
                      count: linkedDrawings.length,
                    })}
                  </span>
                  {canOpenDrawings ? (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-5 gap-1 px-2 text-[9px] font-black tracking-widest text-primary uppercase'
                      asChild
                    >
                      <Link to='/equipment-tooling/drawings'>
                        {t('equipmentTooling.molds.dialog.actions.archive')}{' '}
                        <ExternalLink className='size-2.5' />
                      </Link>
                    </Button>
                  ) : null}
                </div>
                <div className='flex flex-wrap gap-2 px-1'>
                  {linkedDrawings.length > 0 ? (
                    linkedDrawings.slice(0, 4).map((d) => (
                      <Badge
                        key={d.id}
                        variant='outline'
                        className='h-5 rounded-md border-muted/50 bg-white px-2 text-[9px] font-black uppercase'
                      >
                        {d.name.length > 12
                          ? `${d.name.substring(0, 12)}..`
                          : d.name}
                      </Badge>
                    ))
                  ) : (
                    <span className='text-[9px] font-black tracking-widest text-muted-foreground/20 uppercase'>
                      {t('equipmentTooling.molds.dialog.emptyLinkedDrawings')}
                    </span>
                  )}
                  {linkedDrawings.length > 4 && (
                    <span className='text-[9px] font-black text-muted-foreground/30'>
                      +{linkedDrawings.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem className='space-y-3'>
                  <FormLabel className='text-xs font-medium text-foreground'>
                    {t('equipmentTooling.molds.dialog.fields.description')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        'equipmentTooling.molds.dialog.placeholders.description'
                      )}
                      className={`${moldMasterLibraryInputClassName} h-24 resize-none`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>
        </form>
      </Form>
    </ActionDialogShell>
  )
}
