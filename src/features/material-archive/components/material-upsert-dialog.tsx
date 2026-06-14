import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import { type DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { buildHostedQuickActionDialogContentClassName } from '@/components/hosted-quick-action-dialog.styles'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { type Material } from '../data/schema'
import { useMaterialForm } from '../hooks/use-material-form'
import { MaterialForm } from './material-form'

interface MaterialUpsertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  material: Material | null
  defaultCategory?: string
  onSave: (data: Material, isPatch?: boolean, delta?: DeltaSet) => Promise<void>
}

export function MaterialUpsertDialog({
  open,
  onOpenChange,
  material,
  defaultCategory,
  onSave,
}: MaterialUpsertDialogProps) {
  const { t } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { form, selectedCategory, tracker, replace } = useMaterialForm({
    material,
    open,
    defaultCategory,
  })

  const onSubmit = (data: Material) => {
    setIsSubmitting(true)

    // SDRTS: 同步 RHF 数据到 Proxy 用于增量计算
    replace(data)
    const delta = tracker.commit()
    const isEdit = !!material
    const isDirty = Object.keys(delta).length > 0

    // 如果是编辑且无变更，直接关闭
    if (isEdit && !isDirty) {
      onOpenChange(false)
      setIsSubmitting(false)
      return
    }

    onSave(data, isEdit, isEdit ? delta : undefined)
      .then(() => onOpenChange(false))
      .finally(() => setIsSubmitting(false))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={buildHostedQuickActionDialogContentClassName(
          'flex flex-col gap-0 overflow-hidden rounded-[32px] border-none p-0 shadow-2xl md:max-w-[700px]'
        )}
      >
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
        <div className='relative min-h-0 flex-1 overflow-y-auto p-6'>
          <DialogHeader className='mb-4'>
            <div className='flex items-center justify-between gap-3 text-primary'>
              <div className='flex items-center gap-2'>
                <Settings2 className='size-5' />
                <DialogTitle className='text-lg font-black tracking-tighter italic'>
                  {material
                    ? t('materialArchive.upsertDialog.editTitle')
                    : t('materialArchive.upsertDialog.createTitle')}
                </DialogTitle>
              </div>
              {material ? (
                <AuditTimelineTriggerButton
                  module={AUDIT_MODULES.material}
                  targetId={material.id}
                  targetName={material.name || material.code}
                  className='bg-background/70 text-primary'
                />
              ) : null}
            </div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
              <MaterialForm form={form} selectedCategory={selectedCategory} />

              <DialogFooter className='pt-4'>
                <Button
                  variant='outline'
                  type='button'
                  onClick={() => onOpenChange(false)}
                  className='h-12 rounded-full px-8 text-[10px] font-black tracking-widest'
                >
                  {t('materialArchive.upsertDialog.cancel')}
                </Button>
                <Button
                  type='submit'
                  disabled={isSubmitting}
                  className='h-12 rounded-full px-10 text-[10px] font-black tracking-widest shadow-lg shadow-primary/20'
                >
                  {isSubmitting
                    ? t('materialArchive.upsertDialog.submitting')
                    : t('materialArchive.upsertDialog.confirm')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
