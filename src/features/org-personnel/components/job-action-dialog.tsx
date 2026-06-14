'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import type { TranslationKey } from '@/locales'
import { toast } from 'sonner'
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
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { jobTypeSchema, type JobType } from '../data/schema'

type JobTypeForm = JobType
type JobTypeFormInput = z.input<typeof jobTypeSchema>

const jobDialogKeys = {
  successEdit: 'orgPersonnel.org.jobDialog.successEdit',
  successCreate: 'orgPersonnel.org.jobDialog.successCreate',
  editTitle: 'orgPersonnel.org.jobDialog.editTitle',
  createTitle: 'orgPersonnel.org.jobDialog.createTitle',
  desc: 'orgPersonnel.org.jobDialog.desc',
  submit: 'orgPersonnel.org.jobDialog.submit',
  nameLabel: 'orgPersonnel.org.jobDialog.nameLabel',
  namePlaceholder: 'orgPersonnel.org.jobDialog.namePlaceholder',
  codeLabel: 'orgPersonnel.org.jobDialog.codeLabel',
  codePlaceholder: 'orgPersonnel.org.jobDialog.codePlaceholder',
  descLabel: 'orgPersonnel.org.jobDialog.descLabel',
  descPlaceholder: 'orgPersonnel.org.jobDialog.descPlaceholder',
} as const satisfies Record<string, TranslationKey>

type JobActionDialogProps = {
  currentRow?: JobType
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: JobType, isPatch?: boolean, delta?: DeltaSet) => void
}

function getJobFormDefaults(currentRow?: JobType): JobTypeForm {
  if (currentRow) {
    return currentRow
  }

  return {
    // [BACKEND-AUTHORITY]: 物理 ID 严禁在前端使用 Math.random 生成，必须由后端数据库在创建时分配。
    id: '',
    name: '',
    code: '',
    description: '',
    version: 1,
  }
}

type JobActionDialogFormProps = {
  currentRow?: JobType
  isEdit: boolean
  open: boolean
  onSubmit?: (data: JobType, isPatch?: boolean, delta?: DeltaSet) => void
  onOpenChange: (open: boolean) => void
  t: ReturnType<typeof useLanguage>['t']
}

function JobActionDialogForm({
  currentRow,
  isEdit,
  open,
  onSubmit,
  onOpenChange,
  t,
}: JobActionDialogFormProps) {
  const initialValues = useMemo(
    () => getJobFormDefaults(currentRow),
    [currentRow]
  )
  const { data: deltaProxy, tracker } = useDeltaTracker<JobType>(
    initialValues,
    open
  )

  const form = useForm<JobTypeFormInput, unknown, JobTypeForm>({
    resolver: zodResolver(jobTypeSchema),
    defaultValues: initialValues,
  })

  function handleFormSubmit(values: JobTypeForm) {
    // SDRTS: 同步 RHF 对象到 Proxy 以计算 Delta
    Object.assign(deltaProxy, values)
    const delta = tracker.commit()
    const isDirty = Object.keys(delta).length > 0

    if (isEdit && !isDirty) {
      onOpenChange(false)
      return
    }

    toast.success(
      isEdit ? t(jobDialogKeys.successEdit) : t(jobDialogKeys.successCreate)
    )
    if (onSubmit) {
      onSubmit(values, isEdit, isEdit ? delta : undefined)
    }
    onOpenChange(false)
  }

  return (
    <Form {...form}>
      <form
        id='job-form'
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className='space-y-4'
      >
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 py-1'>
              <FormLabel className='col-span-2 text-end text-[10px] font-black tracking-widest uppercase opacity-60'>
                {t(jobDialogKeys.nameLabel)}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t(jobDialogKeys.namePlaceholder)}
                  className='col-span-4 h-11 rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold'
                  {...field}
                />
              </FormControl>
              <FormMessage className='col-span-4 col-start-3' />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='code'
          render={({ field }) => (
            <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1 py-1'>
              <FormLabel className='col-span-2 text-end text-[10px] font-black tracking-widest uppercase opacity-60'>
                {t(jobDialogKeys.codeLabel)}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t(jobDialogKeys.codePlaceholder)}
                  className='col-span-4 h-11 rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold'
                  {...field}
                />
              </FormControl>
              <FormMessage className='col-span-4 col-start-3' />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem className='grid grid-cols-6 items-start space-y-0 gap-x-4 gap-y-1 py-1'>
              <FormLabel className='col-span-2 mt-2 text-end text-[10px] font-black tracking-widest uppercase opacity-60'>
                {t(jobDialogKeys.descLabel)}
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t(jobDialogKeys.descPlaceholder)}
                  className='col-span-4 h-11 rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold'
                  {...field}
                />
              </FormControl>
              <FormMessage className='col-span-4 col-start-3' />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

export function JobActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSubmit,
}: JobActionDialogProps) {
  const { t } = useLanguage()
  const isEdit = !!currentRow
  const formKey = currentRow?.id ?? 'create'
  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-lg',
    header: 'text-start',
    title: 'text-lg font-black tracking-tighter italic uppercase',
    description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
  })

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t(jobDialogKeys.editTitle) : t(jobDialogKeys.createTitle)}
      description={t(jobDialogKeys.desc)}
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <Button
          type='submit'
          form='job-form'
          className='h-11 rounded-full px-8 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-primary/20'
        >
          {t(jobDialogKeys.submit)}
        </Button>
      }
    >
      {open ? (
        <JobActionDialogForm
          key={formKey}
          currentRow={currentRow}
          isEdit={isEdit}
          open={open}
          onSubmit={onSubmit}
          onOpenChange={onOpenChange}
          t={t}
        />
      ) : null}
    </ActionDialogShell>
  )
}
