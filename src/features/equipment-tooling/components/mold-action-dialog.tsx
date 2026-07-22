'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { Plus, RotateCcw, Save, FileText, ExternalLink } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useMoldGroupsQuery } from '../hooks/use-mold-groups-query'
import { AssetService } from '../services/asset-service'
import { MoldCoreService } from '../services/mold-core-service'
import { ImageUpload } from './image-upload'

interface MoldActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: Mold, isPatch?: boolean, delta?: DeltaSet) => void
  editData?: Mold | null
}

export function MoldActionDialog({
  open,
  onOpenChange,
  onConfirm,
  editData,
}: MoldActionDialogProps) {
  const { t } = useLanguage()
  const { allowsAction } = usePermissionActions()
  const user = useAuthStore((state) => state.user)
  const canOpenDrawings = canOpenRouteEntry(user, '/equipment-tooling/drawings')
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false)
  const moldFormSchema = useMemo(() => createMoldSchema(t), [t])
  const defaultDraft = useMemo(
    () => createMoldDraft(editData ?? {}),
    [editData]
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
  const moldGroupsQuery = useMoldGroupsQuery(open)
  const moldDrawingsQuery = useMoldDrawingsQuery(open, editData?.sn)
  const groupNames = moldGroupsQuery.data ?? []
  const linkedDrawings: MoldDrawing[] = moldDrawingsQuery.data ?? []

  const watchedMax = useWatch({ control: form.control, name: 'maxCycles' }) ?? 0
  const watchedCurrent =
    useWatch({ control: form.control, name: 'currentCycles' }) ?? 0
  const healthPercent = AssetService.previewHealthScore(
    watchedCurrent,
    watchedMax
  )

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsAddingNewGroup(false)
    }
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

    const draft = createMoldDraft()
    form.reset(draft)
    reset(draft)
  }, [editData, form, open, reset])

  const onSubmit = async (data: MoldFormOutput) => {
    if (!allowsAction('action_equipment_mold_manage')) return

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
      handleOpenChange(false)
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
    onConfirm(stampedData, isEdit, isEdit ? delta : undefined)
    handleOpenChange(false)
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
      contentClassName='relative w-[95vw] sm:max-w-[550px] max-h-[92vh] flex flex-col p-0 rounded-[32px] border-none shadow-2xl overflow-hidden bg-background'
      headerClassName='pb-4 pt-6 px-6 sm:px-8 relative z-10 shrink-0 text-left'
      bodyClassName='flex-1 overflow-y-auto px-6 sm:px-8 pb-8 custom-scrollbar'
      footerClassName='p-6 sm:px-8 bg-muted/5 border-t border-dashed border-muted-foreground/10 flex flex-row sm:justify-end gap-3 shrink-0'
      titleClassName='text-lg sm:text-xl font-black tracking-tight uppercase italic'
      descriptionClassName='text-[10px] sm:text-xs font-bold text-muted-foreground/60 leading-relaxed mt-2'
      footer={
        <>
          <Button
            type='button'
            variant='ghost'
            className='h-11 flex-1 rounded-full px-8 text-[10px] font-black tracking-widest uppercase sm:flex-none'
            onClick={() => handleOpenChange(false)}
          >
            {t('equipmentTooling.molds.dialog.actions.cancel')}
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            className='h-11 flex-1 gap-2 rounded-full bg-primary px-10 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-primary/20 hover:bg-primary/90 sm:flex-none'
          >
            <Save className='size-3.5' />{' '}
            {t('equipmentTooling.molds.dialog.actions.save')}
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
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='sn'
              render={({ field }) => (
                <FormItem className='space-y-3'>
                  <FormLabel className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('equipmentTooling.molds.dialog.fields.sn')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className='h-12 rounded-2xl border-none bg-muted/50 text-sm font-black tabular-nums transition-all focus:ring-2 focus:ring-primary/20'
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
                  <FormLabel className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('equipmentTooling.molds.dialog.fields.name')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className='h-12 rounded-2xl border-none bg-muted/50 text-sm font-bold transition-all focus:ring-2 focus:ring-primary/20'
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

          <FormField
            control={form.control}
            name='groupName'
            render={({ field }) => (
              <FormItem className='space-y-3'>
                <div className='flex flex-wrap items-center justify-between gap-2 px-1'>
                  <FormLabel className='text-[10px] font-black tracking-widest text-primary/80 uppercase'>
                    {t('equipmentTooling.molds.dialog.fields.group')}
                  </FormLabel>
                  {groupNames.length > 0 && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-5 gap-1 px-2 text-[9px] font-black tracking-widest uppercase hover:bg-primary/5'
                      onClick={() => {
                        setIsAddingNewGroup(!isAddingNewGroup)
                        if (!isAddingNewGroup) field.onChange('')
                      }}
                    >
                      {isAddingNewGroup ? (
                        <>
                          <RotateCcw className='size-2.5' />{' '}
                          {t(
                            'equipmentTooling.molds.dialog.actions.useChooser'
                          )}
                        </>
                      ) : (
                        <>
                          <Plus className='size-2.5' />{' '}
                          {t('equipmentTooling.molds.dialog.actions.newGroup')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
                <FormControl>
                  {isAddingNewGroup || groupNames.length === 0 ? (
                    <Input
                      className='h-12 rounded-2xl border-none bg-muted/50 text-sm font-black transition-all focus:ring-2 focus:ring-primary/20'
                      placeholder={t(
                        'equipmentTooling.molds.dialog.placeholders.newGroup'
                      )}
                      {...field}
                      autoFocus={isAddingNewGroup}
                    />
                  ) : (
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className='h-12 rounded-2xl border-none bg-muted/50 text-sm font-black transition-all focus:ring-2 focus:ring-primary/20'>
                          <SelectValue
                            placeholder={t(
                              'equipmentTooling.molds.dialog.placeholders.selectRegistry'
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='rounded-2xl border-none shadow-2xl'>
                        {groupNames.map((g) => (
                          <SelectItem
                            key={g}
                            value={g}
                            className='py-3 text-[11px] font-black uppercase'
                          >
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='location'
              render={({ field }) => (
                <FormItem className='space-y-3'>
                  <FormLabel className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('equipmentTooling.molds.dialog.fields.location')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className='h-12 rounded-2xl border-none bg-muted/50 text-sm font-black uppercase transition-all focus:ring-2 focus:ring-primary/20'
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
                  <FormLabel className='pl-1 text-[10px] font-black tracking-widest text-primary/80 uppercase'>
                    {t('equipmentTooling.molds.dialog.fields.currentCycles')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      className='h-12 rounded-2xl border-none bg-primary/5 text-sm font-black text-primary tabular-nums transition-all focus:ring-2 focus:ring-primary/20'
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
                  <FormLabel className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                    {t('equipmentTooling.molds.dialog.fields.maxCycles')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      className='h-12 rounded-2xl border-none bg-muted/50 text-sm font-black tabular-nums'
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
                  <FormLabel className='pl-1 text-[10px] font-black tracking-widest text-rose-500/60 uppercase'>
                    {t(
                      'equipmentTooling.molds.dialog.fields.maintenanceThreshold'
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      className='h-12 rounded-2xl border-none bg-rose-500/5 text-sm font-black text-rose-600 tabular-nums focus:ring-rose-200'
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
                <Label className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                  {t('equipmentTooling.molds.dialog.fields.image')}
                </Label>
                <FormControl>
                  <ImageUpload
                    value={field.value}
                    onChange={field.onChange}
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
                  <span className='text-[9px] font-black tracking-widest text-muted-foreground/20 uppercase italic'>
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
                <FormLabel className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                  {t('equipmentTooling.molds.dialog.fields.description')}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t(
                      'equipmentTooling.molds.dialog.placeholders.description'
                    )}
                    className='h-20 resize-none rounded-2xl border-none bg-muted/50 p-4 text-sm font-bold transition-all focus:ring-2 focus:ring-primary/20'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </ActionDialogShell>
  )
}
