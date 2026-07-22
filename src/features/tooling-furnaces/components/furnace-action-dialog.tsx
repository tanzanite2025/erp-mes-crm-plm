'use client'

import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Thermometer } from 'lucide-react'
import { type DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import {
  createFurnaceDraft,
  createFurnaceSchema,
  type Furnace,
  type FurnaceFormInput,
  type FurnaceFormOutput,
} from '@/features/equipment-tooling/data/schema'
import { prepareTrackedDialogSubmit } from '@/features/equipment-tooling/utils/tracked-dialog-submit'

interface FurnaceActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (data: Furnace, isPatch?: boolean, delta?: DeltaSet) => void
  editData?: Furnace | null
}

export function FurnaceActionDialog({
  open,
  onOpenChange,
  onConfirm,
  editData,
}: FurnaceActionDialogProps) {
  const { t } = useLanguage()
  const { allowsAction } = usePermissionActions()
  const defaultFurnaceType = t('equipmentTooling.furnaces.dialog.defaults.type')
  const furnaceFormSchema = useMemo(() => createFurnaceSchema(t), [t])
  const defaultDraft = useMemo(
    () => createFurnaceDraft(defaultFurnaceType, editData ?? {}),
    [defaultFurnaceType, editData]
  )

  const { commit, deltaProxy, reset } = useDeltaTracker<Furnace>(
    defaultDraft,
    open
  )
  const isEdit = !!editData

  const form = useForm<FurnaceFormInput, unknown, FurnaceFormOutput>({
    resolver: zodResolver(furnaceFormSchema),
    defaultValues: defaultDraft,
  })

  useEffect(() => {
    if (!open) return

    const draft = editData
      ? createFurnaceDraft(defaultFurnaceType, editData)
      : createFurnaceDraft(defaultFurnaceType)
    form.reset(draft)
    reset(draft)
  }, [defaultFurnaceType, editData, form, open, reset])

  const onSubmit = (data: FurnaceFormOutput) => {
    if (!allowsAction('action_equipment_furnace_manage')) return

    const { delta, isDirty, patchDelta } = prepareTrackedDialogSubmit({
      values: data,
      deltaProxy,
      commit,
      isEdit,
    })

    if (isEdit && !isDirty) {
      onOpenChange(false)
      return
    }

    if (isEdit && editData?.version === undefined) {
      throw new Error(
        '[CRITICAL] 炉台编辑模式下版本号(version)缺失，无法执行 SDRTS 安全 Patch。'
      )
    }

    onConfirm(data as Furnace, isEdit, patchDelta ?? delta)
    onOpenChange(false)
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className='flex items-center gap-2 text-primary'>
          <Thermometer className='size-5' />
          <span>
            {editData
              ? t('equipmentTooling.furnaces.dialog.title.edit')
              : t('equipmentTooling.furnaces.dialog.title.create')}
          </span>
        </div>
      }
      description={t('equipmentTooling.furnaces.dialog.description')}
      contentDecoration={
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
      }
      contentClassName='flex max-h-[92vh] w-[95vw] flex-col overflow-hidden rounded-[32px] border-none bg-background p-0 shadow-2xl sm:max-w-lg'
      headerClassName='shrink-0 border-b border-dashed bg-primary/5 p-6 pb-4 text-left sm:p-8'
      bodyClassName='custom-scrollbar flex-1 overflow-y-auto p-6 sm:p-8'
      footerClassName='flex shrink-0 flex-row gap-3 border-t border-dashed border-muted-foreground/10 bg-muted/5 p-6 sm:justify-end sm:p-8'
      titleClassName='text-lg font-black italic uppercase tracking-tighter'
      descriptionClassName='text-[9px] font-black uppercase tracking-widest opacity-60'
      footer={
        <>
          <Button
            type='button'
            variant='ghost'
            onClick={() => onOpenChange(false)}
            className='h-11 flex-1 rounded-full px-8 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase sm:flex-none'
          >
            {t('equipmentTooling.furnaces.dialog.actions.cancel')}
          </Button>
          <Button
            type='submit'
            onClick={form.handleSubmit(onSubmit)}
            className='h-11 flex-1 rounded-full bg-blue-600 px-10 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 sm:flex-none'
          >
            {t('equipmentTooling.furnaces.dialog.actions.save')}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='sn'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
                    {t('equipmentTooling.furnaces.dialog.fields.sn')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        'equipmentTooling.furnaces.dialog.placeholders.sn'
                      )}
                      className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-black italic shadow-inner'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
                    {t('equipmentTooling.furnaces.dialog.fields.name')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        'equipmentTooling.furnaces.dialog.placeholders.name'
                      )}
                      className='h-12 rounded-2xl border-none bg-muted/50 font-bold shadow-inner'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
          </div>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
                    {t('equipmentTooling.furnaces.dialog.fields.type')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        'equipmentTooling.furnaces.dialog.placeholders.type'
                      )}
                      className='h-12 rounded-2xl border-none bg-muted/50 font-bold shadow-inner'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='location'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
                    {t('equipmentTooling.furnaces.dialog.fields.location')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        'equipmentTooling.furnaces.dialog.placeholders.location'
                      )}
                      className='h-12 rounded-2xl border-none bg-muted/50 font-bold shadow-inner'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='maxTemp'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
                  {t('equipmentTooling.furnaces.dialog.fields.maxTemp')}
                </FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    className='h-12 rounded-2xl border-none bg-muted/50 font-mono font-black italic shadow-inner'
                    {...field}
                    onChange={(e) =>
                      field.onChange(Number.parseInt(e.target.value, 10))
                    }
                  />
                </FormControl>
                <FormMessage className='text-[10px] font-bold' />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase italic'>
                  {t('equipmentTooling.furnaces.dialog.fields.description')}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t(
                      'equipmentTooling.furnaces.dialog.placeholders.description'
                    )}
                    className='min-h-[100px] resize-none rounded-2xl border-none bg-muted/50 font-medium'
                    {...field}
                  />
                </FormControl>
                <FormMessage className='text-[10px] font-bold' />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </ActionDialogShell>
  )
}
