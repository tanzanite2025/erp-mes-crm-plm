import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Percent, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { isConflictError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { type TaxRate } from '../data/taxation'
import { financeQueryKeys } from '../query-keys'
import { taxService } from '../services/tax-service'

interface TaxActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingRate: TaxRate | null
}

const DEFAULT_RATE: Partial<TaxRate> = {
  code: '',
  name: '',
  rate: 13,
  status: 'Active',
  description: '',
  version: 1,
}

export function TaxActionDialog({
  open,
  onOpenChange,
  editingRate,
}: TaxActionDialogProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const isEdit = !!editingRate

  const shellClasses = buildActionDialogShellClasses({
    content: 'max-w-[95vw] sm:max-w-[500px] rounded-[32px]',
    header: 'p-8 pb-4 border-none bg-muted/5',
    title:
      'text-xl font-black italic tracking-tighter uppercase flex items-center gap-3',
    description: 'text-[10px] font-bold uppercase tracking-widest opacity-50',
    body: 'p-8 pt-4 space-y-6',
    footer:
      'p-6 bg-muted/5 border-t border-dashed border-muted/20 flex items-center justify-end gap-3',
  })

  const initialFormData = useMemo(
    () => (editingRate ? editingRate : (DEFAULT_RATE as TaxRate)),
    [editingRate]
  )
  const { data: formData, tracker } = useDeltaTracker(initialFormData, open)
  const updateFormData = (patch: Partial<TaxRate>) => {
    tracker.replace({ ...formData, ...patch })
  }

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast.error(t('finance.taxation.toast.formIncomplete'))
      return
    }

    try {
      const isPatch = isEdit
      const data = {
        ...formData,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        id: editingRate?.id || '',
      } as TaxRate

      if (isPatch && editingRate?.id) {
        const delta = tracker.commit()
        if (Object.keys(delta).length === 0) {
          onOpenChange(false)
          return
        }
        await taxService.patchTaxRate(
          editingRate.id,
          delta,
          editingRate.version
        )
      } else {
        await taxService.saveTaxRate(data)
      }

      toast.success(
        isPatch
          ? t('finance.taxation.toast.saveSuccessUpdated')
          : t('finance.taxation.toast.saveSuccessCreated')
      )

      await queryClient.invalidateQueries({
        queryKey: financeQueryKeys.taxRates(),
      })
      onOpenChange(false)
    } catch (error) {
      if (isConflictError(error)) {
        toast.error(
          t('finance.paymentTerms.toast.conflict') || '数据已被更新，请刷新重试'
        )
        return
      }
      toast.error(t('finance.taxation.toast.saveFailed'))
    }
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <Percent className='size-6 text-emerald-600' />
          {isEdit
            ? t('finance.taxation.dialog.editTitle')
            : t('finance.taxation.dialog.createTitle')}
        </>
      }
      description={t('finance.taxation.page.subtitle')}
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            className='h-12 rounded-full px-8 text-[10px] font-black tracking-widest uppercase'
          >
            {t('common.actions.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className='h-12 rounded-full bg-emerald-600 px-10 font-black tracking-widest text-white uppercase shadow-lg shadow-emerald-500/20 hover:bg-emerald-700'
          >
            {t('finance.taxation.dialog.save')}
          </Button>
        </>
      }
    >
      <div className='space-y-6'>
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t('finance.taxation.dialog.codeLabel')}
            </Label>
            <Input
              placeholder={t('finance.taxation.dialog.codePlaceholder')}
              value={formData.code}
              onChange={(e) => {
                updateFormData({ code: e.target.value.toUpperCase() })
              }}
              className='h-12 rounded-2xl bg-muted/5 font-black italic'
            />
          </div>
          <div className='space-y-2'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t('finance.taxation.dialog.rateLabel')}
            </Label>
            <div className='relative'>
              <Input
                type='number'
                placeholder={t('finance.taxation.dialog.ratePlaceholder')}
                value={formData.rate}
                onChange={(e) => {
                  updateFormData({ rate: Number(e.target.value) })
                }}
                className='h-12 rounded-2xl bg-muted/5 pr-8 font-mono font-bold'
              />
              <span className='absolute top-1/2 right-3 -translate-y-1/2 text-xs font-black opacity-30'>
                %
              </span>
            </div>
          </div>
        </div>

        <div className='space-y-2'>
          <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
            {t('finance.taxation.dialog.nameLabel')}
          </Label>
          <Input
            placeholder={t('finance.taxation.dialog.namePlaceholder')}
            value={formData.name}
            onChange={(e) => {
              updateFormData({ name: e.target.value })
            }}
            className='h-12 rounded-2xl bg-muted/5 font-bold'
          />
        </div>

        <div className='space-y-2'>
          <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
            {t('finance.taxation.dialog.descriptionLabel')}
          </Label>
          <Textarea
            placeholder={t('finance.taxation.dialog.descriptionPlaceholder')}
            value={formData.description}
            onChange={(e) => {
              updateFormData({ description: e.target.value })
            }}
            className='min-h-[100px] rounded-2xl border-dashed bg-muted/5 transition-all focus:border-emerald-500/50'
          />
        </div>

        <div className='flex items-center gap-3 rounded-2xl border border-dashed border-blue-500/20 bg-blue-500/5 p-4'>
          <ShieldAlert className='size-4 shrink-0 text-blue-500' />
          <p className='text-[8px] leading-relaxed font-bold tracking-widest text-blue-600/70 uppercase'>
            {t('finance.taxation.guard.content').slice(0, 80)}...
          </p>
        </div>
      </div>
    </ActionDialogShell>
  )
}
