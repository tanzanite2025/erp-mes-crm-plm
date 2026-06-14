import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CreditCard, Info, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { isConflictError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { type PaymentTerm } from '../data/schema'
import { financeQueryKeys } from '../query-keys'
import { PaymentTermMaintenanceService } from '../services/payment-term-maintenance-service'

interface PaymentTermActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTerm: PaymentTerm | null
}

const DEFAULT_TERM: Partial<PaymentTerm> = {
  code: '',
  name: '',
  description: '',
  installments: '',
  isDefault: false,
  sortOrder: 0,
  status: 'Active',
  version: 1,
}

export function PaymentTermActionDialog({
  open,
  onOpenChange,
  editingTerm,
}: PaymentTermActionDialogProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const isEdit = !!editingTerm

  const shellClasses = buildActionDialogShellClasses({
    content: 'max-w-[95vw] sm:max-w-[520px] rounded-[32px]',
    header: 'p-8 pb-4 border-none bg-muted/5',
    title:
      'text-xl font-black italic tracking-tighter uppercase flex items-center gap-3',
    description: 'text-[10px] font-bold uppercase tracking-widest opacity-50',
    body: 'p-8 pt-4 space-y-6',
    footer:
      'p-6 bg-muted/5 border-t border-dashed border-muted/20 flex items-center justify-end gap-3',
  })

  const initialFormData = useMemo(
    () => (editingTerm ? editingTerm : (DEFAULT_TERM as PaymentTerm)),
    [editingTerm]
  )
  const { data: formData, tracker } = useDeltaTracker(initialFormData, open)
  const codeLocked = isEdit
  const updateFormData = (patch: Partial<PaymentTerm>) => {
    tracker.replace({ ...formData, ...patch })
  }

  const handleSave = async () => {
    if (!formData.code?.trim() || !formData.name?.trim()) {
      toast.error(t('finance.paymentTerms.toast.formIncomplete'))
      return
    }

    try {
      if (isEdit && editingTerm?.id) {
        const delta = tracker.commit()
        if (Object.keys(delta).length === 0) {
          onOpenChange(false)
          return
        }
        await PaymentTermMaintenanceService.patchPaymentTerm(
          editingTerm.id,
          delta,
          editingTerm.version
        )
      } else {
        await PaymentTermMaintenanceService.savePaymentTerm({
          ...formData,
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description?.trim() || '',
        })
      }

      toast.success(
        isEdit
          ? t('finance.paymentTerms.toast.saveSuccessUpdated')
          : t('finance.paymentTerms.toast.saveSuccessCreated')
      )
      await queryClient.invalidateQueries({
        queryKey: financeQueryKeys.paymentTerms(),
      })
      onOpenChange(false)
    } catch (error) {
      if (isConflictError(error)) {
        toast.error(t('finance.paymentTerms.toast.conflict'))
        return
      }
      toast.error(t('finance.paymentTerms.toast.saveFailed'))
    }
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <CreditCard className='size-6 text-primary' />
          {isEdit
            ? t('finance.paymentTerms.dialog.editTitle')
            : t('finance.paymentTerms.dialog.createTitle')}
        </>
      }
      description={t('finance.paymentTerms.page.subtitle')}
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
            className='h-12 rounded-full bg-primary px-10 font-black tracking-widest text-primary-foreground uppercase shadow-lg shadow-primary/20'
          >
            {isEdit
              ? t('finance.paymentTerms.dialog.save')
              : t('finance.paymentTerms.page.addPlan')}
          </Button>
        </>
      }
    >
      <div className='space-y-6'>
        {editingTerm?.isSystem ? (
          <div className='flex items-center gap-3 rounded-2xl border border-dashed border-blue-500/20 bg-blue-500/5 p-4'>
            <Lock className='size-4 shrink-0 text-blue-600' />
            <div className='space-y-1'>
              <p className='text-[10px] font-black tracking-widest text-blue-700 uppercase'>
                {t('finance.paymentTerms.card.systemBadge')}
              </p>
              <p className='text-[11px] leading-relaxed font-bold text-blue-700/80'>
                {t('finance.paymentTerms.dialog.systemHint')}
              </p>
            </div>
          </div>
        ) : null}

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t('finance.paymentTerms.dialog.codeLabel')}
            </Label>
            <Input
              placeholder={t('finance.paymentTerms.dialog.codePlaceholder')}
              value={formData.code}
              readOnly={codeLocked}
              onChange={(e) => {
                updateFormData({ code: e.target.value.toUpperCase() })
              }}
              className={`h-12 rounded-2xl font-black italic ${
                codeLocked
                  ? 'border-dashed border-blue-500/30 bg-blue-500/5 text-blue-700'
                  : 'bg-muted/5'
              }`}
            />
            {codeLocked ? (
              <p className='flex items-center gap-1.5 pl-1 text-[9px] font-bold tracking-wide text-blue-700/70'>
                <Lock className='size-3' />
                {editingTerm?.isSystem
                  ? t('finance.paymentTerms.dialog.systemHint')
                  : t('finance.paymentTerms.dialog.codeLockedHint')}
              </p>
            ) : null}
          </div>
          <div className='space-y-2'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t('finance.paymentTerms.dialog.nameLabel')}
            </Label>
            <Input
              placeholder={t('finance.paymentTerms.dialog.namePlaceholder')}
              value={formData.name}
              onChange={(e) => {
                updateFormData({ name: e.target.value })
              }}
              className='h-12 rounded-2xl bg-muted/5 font-bold'
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
            {t('finance.paymentTerms.dialog.descriptionLabel')}
          </Label>
          <Textarea
            placeholder={t(
              'finance.paymentTerms.dialog.descriptionPlaceholder'
            )}
            value={formData.description}
            onChange={(e) => {
              updateFormData({ description: e.target.value })
            }}
            className='min-h-[100px] rounded-2xl border-dashed bg-muted/5 transition-all focus:border-primary/50'
          />
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t('finance.paymentTerms.dialog.sortOrderLabel')}
            </Label>
            <Input
              type='number'
              value={String(formData.sortOrder ?? 0)}
              onChange={(e) => {
                updateFormData({ sortOrder: Number(e.target.value || 0) })
              }}
              className='h-12 rounded-2xl bg-muted/5 font-bold'
            />
          </div>
          <div className='space-y-2'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t('finance.paymentTerms.dialog.statusLabel')}
            </Label>
            <select
              value={formData.status || 'Active'}
              onChange={(e) => {
                updateFormData({
                  status: e.target.value as PaymentTerm['status'],
                })
              }}
              className='h-12 w-full appearance-none rounded-2xl border border-dashed border-muted/20 bg-muted/5 px-4 text-[12px] font-bold shadow-sm focus:ring-2 focus:ring-primary/20'
            >
              <option value='Active'>
                {t('finance.paymentTerms.status.active')}
              </option>
              <option value='Inactive'>
                {t('finance.paymentTerms.status.inactive')}
              </option>
            </select>
          </div>
        </div>

        <div className='flex items-center justify-between rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-4'>
          <div className='space-y-0.5'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-primary uppercase'>
              <CreditCard className='size-3' />{' '}
              {t('finance.paymentTerms.card.defaultBadge')}
            </Label>
            <p className='text-[8px] font-bold tracking-widest text-muted-foreground/60 uppercase'>
              {t('finance.paymentTerms.dialog.defaultHint')}
            </p>
          </div>
          <Switch
            checked={formData.isDefault}
            onCheckedChange={(checked) => {
              updateFormData({ isDefault: checked })
            }}
          />
        </div>

        {editingTerm?.isSystem ? (
          <div className='flex items-center gap-3 rounded-2xl border border-dashed border-blue-500/20 bg-blue-500/5 p-4'>
            <Info className='size-4 shrink-0 text-blue-500' />
            <p className='text-[8px] leading-relaxed font-bold tracking-widest text-blue-600/70 uppercase'>
              {t('finance.paymentTerms.dialog.systemHint')}
            </p>
          </div>
        ) : null}

        <div className='flex items-center gap-3 rounded-2xl border border-dashed border-orange-500/20 bg-orange-500/5 p-4'>
          <Info className='size-4 shrink-0 text-orange-500' />
          <p className='text-[8px] leading-relaxed font-bold tracking-widest text-orange-600/70 uppercase'>
            {t('finance.paymentTerms.guard.warning')}
          </p>
        </div>

        <div className='flex items-center gap-3 rounded-2xl border border-dashed border-muted/20 bg-muted/10 p-4'>
          <Info className='size-4 shrink-0 text-muted-foreground' />
          <p className='text-[8px] font-bold tracking-widest text-muted-foreground/70 uppercase'>
            {t('finance.paymentTerms.dialog.codeLockedHint')}
          </p>
        </div>
      </div>
    </ActionDialogShell>
  )
}
