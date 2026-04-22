import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
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
import { Textarea } from '@/components/ui/textarea'
import { type StandardCommand } from '../../data/schema'

type CommandFormInput = Omit<StandardCommand, 'id' | 'createdAt'>

interface CommandFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: StandardCommand
  onSave: (data: Omit<StandardCommand, 'id' | 'createdAt'>) => void
}

export function CommandForm({ open, onOpenChange, initialData, onSave }: CommandFormProps) {
  const { t } = useLanguage()
  const { register, handleSubmit, reset } = useForm<CommandFormInput>({
    defaultValues: {
      actionType: 'NOTIFY',
      bindType: 'GLOBAL',
      nodeType: undefined,
      title: '',
      content: '',
      targetLink: '',
      params: [],
    },
  })

  useEffect(() => {
    if (initialData) {
      reset({
        actionType: initialData.actionType,
        bindType: initialData.bindType,
        nodeType: initialData.nodeType,
        title: initialData.title,
        content: initialData.content,
        targetLink: initialData.targetLink || '',
        params: initialData.params || [],
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
    })
  }, [initialData, open, reset])

  const onSubmit = (data: CommandFormInput) => {
    onSave(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='rounded-[32px] border-4 sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='text-sm font-black uppercase tracking-widest'>
            {initialData
              ? t('workflowCore.commands.form.editTitle')
              : t('workflowCore.commands.form.newTitle')}
          </DialogTitle>
          <DialogDescription className='text-[10px] font-bold'>
            {t('workflowCore.commands.form.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6 pt-4'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase text-muted-foreground'>
              {t('workflowCore.commands.form.fields.title')}
            </Label>
            <Input
              placeholder={t('workflowCore.commands.form.placeholders.title')}
              className='h-10 rounded-xl font-bold text-xs'
              {...register('title', { required: true })}
            />
          </div>

          <div className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-[10px] font-medium text-muted-foreground'>
            模板适用范围和关联环节已改由消息中心规则上下文决定，这里只维护通知内容本身。
          </div>

          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase text-muted-foreground'>
              {t('workflowCore.commands.form.fields.params')}
            </Label>
            <Input
              placeholder={t('workflowCore.commands.form.placeholders.params')}
              className='h-10 rounded-xl font-bold text-xs'
              {...register('params', {
                setValueAs: (value) =>
                  typeof value === 'string'
                    ? value
                        .split(',')
                        .map((segment) => segment.trim())
                        .filter(Boolean)
                    : value,
              })}
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase text-muted-foreground'>
              {t('workflowCore.commands.form.fields.targetLink')}
            </Label>
            <Input
              placeholder={t('workflowCore.commands.form.placeholders.targetLink')}
              className='h-10 rounded-xl border-2 border-dashed font-bold text-xs'
              {...register('targetLink')}
            />
            <p className='text-[9px] font-medium text-muted-foreground'>
              {t('workflowCore.commands.form.targetLinkHint')}
            </p>
          </div>

          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase text-muted-foreground'>
              {t('workflowCore.commands.form.fields.content')}
            </Label>
            <Textarea
              placeholder={t('workflowCore.commands.form.placeholders.content')}
              className='min-h-[80px] rounded-[24px] border-2 font-bold text-xs leading-relaxed'
              {...register('content', { required: true })}
            />
          </div>

          <div className='flex justify-end gap-3 pt-4'>
            <Button
              type='button'
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='rounded-xl font-black text-[10px] uppercase'
            >
              {t('common.actions.cancel')}
            </Button>
            <Button type='submit' className='rounded-xl px-8 font-black text-[10px] uppercase tracking-widest'>
              {t('common.actions.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
