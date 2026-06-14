import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { normalizeSearchHref } from '@/components/layout/data/search-href'
import { getBusinessEventStatusDerivedLabel } from '../../data/business-event-status-contract'
import {
  getStandardCommandDisplayTitle,
  type StandardCommand,
} from '../../data/schema'
import { useBusinessEventSources } from '../../hooks/use-business-event-sources'
import { CommandTargetLinkPicker } from './command-target-link-picker'

type CommandFormInput = Omit<StandardCommand, 'id' | 'createdAt'>

interface CommandFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: StandardCommand
  contextDefaults?: Partial<
    Pick<StandardCommand, 'sourceCode' | 'actionCode' | 'statusCodes'>
  >
  onSave: (data: Omit<StandardCommand, 'id' | 'createdAt'>) => void
}

export function CommandForm({
  open,
  onOpenChange,
  initialData,
  contextDefaults,
  onSave,
}: CommandFormProps) {
  const { t } = useLanguage()
  const { sources } = useBusinessEventSources()
  const [isTargetLinkValid, setIsTargetLinkValid] = useState(true)
  const { register, control, handleSubmit, reset, setValue } =
    useForm<CommandFormInput>({
      defaultValues: {
        actionType: 'NOTIFY',
        bindType: 'GLOBAL',
        nodeType: undefined,
        title: '',
        content: '',
        targetLink: '',
        params: [],
        sourceCode: '',
        actionCode: '',
        statusCodes: [],
      },
    })

  const watchedSourceCode = useWatch({ control, name: 'sourceCode' })
  const watchedActionCode = useWatch({ control, name: 'actionCode' })
  const watchedStatusCodes = useWatch({ control, name: 'statusCodes' })
  const watchedTargetLink = useWatch({ control, name: 'targetLink' })
  const selectedSourceCode = watchedSourceCode ?? ''
  const selectedActionCode = watchedActionCode ?? ''
  const selectedStatusCodes = useMemo(
    () => watchedStatusCodes ?? [],
    [watchedStatusCodes]
  )
  const selectedTargetLink = watchedTargetLink ?? ''
  const selectedSource = useMemo(
    () => sources.find((source) => source.code === selectedSourceCode),
    [selectedSourceCode, sources]
  )
  const selectedStatusOptions = useMemo(
    () =>
      (selectedSource?.config.statuses ?? []).map((status) => ({
        code: status.code,
        label: getBusinessEventStatusDerivedLabel(selectedSource?.code, status),
      })),
    [selectedSource]
  )
  const generatedTitle = useMemo(
    () =>
      getStandardCommandDisplayTitle(
        {
          sourceCode: selectedSourceCode,
          actionCode: selectedActionCode,
          statusCodes: selectedStatusCodes,
        },
        sources
      ),
    [selectedActionCode, selectedSourceCode, selectedStatusCodes, sources]
  )

  useEffect(() => {
    if (initialData) {
      reset({
        actionType: initialData.actionType,
        bindType: initialData.bindType,
        nodeType: initialData.nodeType,
        title: initialData.title,
        content: initialData.content,
        targetLink: initialData.targetLink
          ? normalizeSearchHref(initialData.targetLink)
          : '',
        params: initialData.params || [],
        sourceCode: initialData.sourceCode || contextDefaults?.sourceCode || '',
        actionCode: initialData.actionCode || contextDefaults?.actionCode || '',
        statusCodes:
          initialData.statusCodes?.length > 0
            ? initialData.statusCodes
            : contextDefaults?.statusCodes || [],
      })
      return
    }

    reset({
      actionType: 'NOTIFY',
      bindType: 'GLOBAL',
      nodeType: undefined,
      title: '',
      content: '',
      targetLink: '',
      params: [],
      sourceCode: contextDefaults?.sourceCode || '',
      actionCode: contextDefaults?.actionCode || '',
      statusCodes: contextDefaults?.statusCodes || [],
    })
  }, [contextDefaults, initialData, open, reset])

  useEffect(() => {
    if (!selectedSource) {
      if (selectedActionCode) {
        setValue('actionCode', '', { shouldDirty: true })
      }
      if (selectedStatusCodes.length > 0) {
        setValue('statusCodes', [], { shouldDirty: true })
      }
      return
    }

    if (
      selectedActionCode &&
      !selectedSource.config.actions.some(
        (action) => action.code === selectedActionCode
      )
    ) {
      setValue('actionCode', '', { shouldDirty: true })
    }

    const allowedStatuses = new Set(
      selectedSource.config.statuses.map((status) => status.code)
    )
    const nextStatusCodes = selectedStatusCodes.filter((code) =>
      allowedStatuses.has(code)
    )
    if (nextStatusCodes.length !== selectedStatusCodes.length) {
      setValue('statusCodes', nextStatusCodes, { shouldDirty: true })
    }
  }, [selectedActionCode, selectedSource, selectedStatusCodes, setValue])

  const onSubmit = (data: CommandFormInput) => {
    if (!isTargetLinkValid) {
      return
    }
    onSave({
      ...data,
      title: generatedTitle,
    })
  }

  const toggleStatusCode = (statusCode: string) => {
    const nextStatusCodes = selectedStatusCodes.includes(statusCode)
      ? selectedStatusCodes.filter((code) => code !== statusCode)
      : [...selectedStatusCodes, statusCode]
    setValue('statusCodes', nextStatusCodes, { shouldDirty: true })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='rounded-[32px] border-4 sm:max-w-[840px]'>
        <DialogHeader>
          <DialogTitle className='text-sm font-black tracking-widest uppercase'>
            {initialData
              ? t('workflowCore.commands.form.editTitle')
              : t('workflowCore.commands.form.newTitle')}
          </DialogTitle>
          <DialogDescription className='text-[10px] font-bold'>
            {t('workflowCore.commands.form.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6 pt-4'>
          <div className='grid gap-4 rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black text-muted-foreground uppercase'>
                适用业务事件源
              </Label>
              <select
                value={selectedSourceCode}
                onChange={(event) =>
                  setValue('sourceCode', event.target.value, {
                    shouldDirty: true,
                  })
                }
                className='h-12 w-full rounded-2xl border-none bg-background px-4 text-xs font-black'
              >
                <option value=''>全部业务事件源</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.code}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-2'>
              <Label className='text-[10px] font-black text-muted-foreground uppercase'>
                适用动作
              </Label>
              <select
                value={selectedActionCode}
                disabled={!selectedSource}
                onChange={(event) =>
                  setValue('actionCode', event.target.value, {
                    shouldDirty: true,
                  })
                }
                className='h-12 w-full rounded-2xl border-none bg-background px-4 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50'
              >
                <option value=''>全部动作</option>
                {(selectedSource?.config.actions ?? []).map((action) => (
                  <option key={action.code} value={action.code}>
                    {action.name}
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-2 md:col-span-2'>
              <Label className='text-[10px] font-black text-muted-foreground uppercase'>
                适用状态
              </Label>
              <div className='rounded-[24px] border border-dashed border-primary/15 bg-background/80 p-3'>
                {selectedSource ? (
                  <div className='flex flex-wrap gap-2'>
                    {selectedStatusOptions.map((status) => {
                      const active = selectedStatusCodes.includes(status.code)
                      return (
                        <button
                          key={status.code}
                          type='button'
                          onClick={() => toggleStatusCode(status.code)}
                          className={cn(
                            'flex min-h-12 min-w-28 flex-col items-center justify-center rounded-2xl px-4 py-2 text-center transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                          )}
                        >
                          <span className='text-[10px] font-black tracking-widest'>
                            {status.label}
                          </span>
                          <span
                            className={cn(
                              'font-mono text-[8px]',
                              active
                                ? 'text-primary-foreground/80'
                                : 'text-muted-foreground/70'
                            )}
                          >
                            {status.code}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className='text-[10px] font-bold text-muted-foreground'>
                    先选择业务事件源后，再限定适用状态；留空则表示该模板对全部状态通用。
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className='rounded-[24px] border border-dashed border-primary/15 bg-primary/5 px-4 py-3'>
            <div className='text-[10px] font-black tracking-widest text-primary/70 uppercase'>
              系统自动生成模板名称
            </div>
            <div className='mt-2 text-[12px] font-black text-foreground'>
              {generatedTitle}
            </div>
          </div>

          <div className='space-y-2'>
            <Label className='text-[10px] font-black text-muted-foreground uppercase'>
              {t('workflowCore.commands.form.fields.targetLink')}
            </Label>
            <CommandTargetLinkPicker
              value={selectedTargetLink}
              onChange={(nextValue) =>
                setValue('targetLink', nextValue, { shouldDirty: true })
              }
              onValidityChange={setIsTargetLinkValid}
            />
            {!isTargetLinkValid ? (
              <p className='text-[9px] font-black text-rose-600'>
                当前跳转目标未纳入结构化映射，请重新选择规范化页面目标后再保存。
              </p>
            ) : null}
            <p className='text-[9px] font-medium text-muted-foreground'>
              当前不支持手填链接，只能从系统已注册的结构化页面目标中选择。
            </p>
          </div>

          <div className='space-y-2'>
            <Label className='text-[10px] font-black text-muted-foreground uppercase'>
              {t('workflowCore.commands.form.fields.content')}
            </Label>
            <Textarea
              placeholder={t('workflowCore.commands.form.placeholders.content')}
              className='min-h-[80px] rounded-[24px] border-2 text-xs leading-relaxed font-bold'
              {...register('content', { required: true })}
            />
          </div>

          <div className='flex justify-end gap-3 pt-4'>
            <Button
              type='button'
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='rounded-xl text-[10px] font-black uppercase'
            >
              {t('common.actions.cancel')}
            </Button>
            <Button
              type='submit'
              disabled={!isTargetLinkValid}
              className='rounded-xl px-8 text-[10px] font-black tracking-widest uppercase'
            >
              {t('common.actions.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
