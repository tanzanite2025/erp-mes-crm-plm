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
import { type PaymentMethod } from '../data/schema'
import { financeQueryKeys } from '../query-keys'
import { PaymentMethodMaintenanceService } from '../services/payment-method-maintenance-service'

interface PaymentMethodActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingMethod: PaymentMethod | null
}

const DEFAULT_METHOD: Partial<PaymentMethod> = {
  code: '',
  name: '',
  description: '',
  isDefault: false,
  sortOrder: 0,
  status: 'Active',
  version: 1,
}

export function PaymentMethodActionDialog({
  open,
  onOpenChange,
  editingMethod,
}: PaymentMethodActionDialogProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const isEdit = !!editingMethod
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
    () => (editingMethod ? editingMethod : (DEFAULT_METHOD as PaymentMethod)),
    [editingMethod]
  )
  const { data: formData, tracker } = useDeltaTracker(initialFormData, open)
  const codeLocked = isEdit
  const updateFormData = (patch: Partial<PaymentMethod>) => {
    tracker.replace({ ...formData, ...patch })
  }

  const handleSave = async () => {
    if (!formData.code?.trim() || !formData.name?.trim()) {
      toast.error(t('finance.paymentMethods.toast.formIncomplete'))
      return
    }

    try {
      if (isEdit && editingMethod?.id) {
        const delta = tracker.commit()
        if (Object.keys(delta).length === 0) {
          onOpenChange(false)
          return
        }
        await PaymentMethodMaintenanceService.patchPaymentMethod(
          editingMethod.id,
          delta,
          editingMethod.version
        )
      } else {
        await PaymentMethodMaintenanceService.savePaymentMethod({
          ...formData,
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description?.trim() || '',
        })
      }

      toast.success(
        isEdit
          ? t('finance.paymentMethods.toast.saveSuccessUpdated')
          : t('finance.paymentMethods.toast.saveSuccessCreated')
      )
      await queryClient.invalidateQueries({
        queryKey: financeQueryKeys.paymentMethods(),
      })
      onOpenChange(false)
    } catch (error) {
      if (isConflictError(error)) {
        toast.error(t('finance.paymentMethods.toast.conflict'))
        return
      }
      toast.error(t('finance.paymentMethods.toast.saveFailed'))
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
            ? t('finance.paymentMethods.dialog.editTitle')
            : t('finance.paymentMethods.dialog.createTitle')}
        </>
      }
      description={t('finance.paymentMethods.page.subtitle')}
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
              ? t('finance.paymentMethods.dialog.save')
              : t('finance.paymentMethods.page.add')}
          </Button>
        </>
      }
    >
      <div className='space-y-6'>
        {editingMethod?.isSystem ? (
          <div className='flex items-center gap-3 rounded-2xl border border-dashed border-blue-500/20 bg-blue-500/5 p-4'>
            <Lock className='size-4 shrink-0 text-blue-600' />
            <div className='space-y-1'>
              <p className='text-[10px] font-black tracking-widest text-blue-700 uppercase'>
                {t('finance.paymentMethods.card.systemBadge')}
              </p>
              <p className='text-[11px] leading-relaxed font-bold text-blue-700/80'>
                {t('finance.paymentMethods.dialog.systemHint')}
              </p>
            </div>
          </div>
        ) : null}

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t('finance.paymentMethods.dialog.codeLabel')}
            </Label>
            <Input
              placeholder={t('finance.paymentMethods.dialog.codePlaceholder')}
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
                {editingMethod?.isSystem
                  ? t('finance.paymentMethods.dialog.systemHint')
                  : t('finance.paymentMethods.dialog.codeLockedHint')}
              </p>
            ) : null}
          </div>
          <div className='space-y-2'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t('finance.paymentMethods.dialog.nameLabel')}
            </Label>
            <Input
              placeholder={t('finance.paymentMethods.dialog.namePlaceholder')}
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
            {t('finance.paymentMethods.dialog.descriptionLabel')}
          </Label>
          <Textarea
            placeholder={t(
              'finance.paymentMethods.dialog.descriptionPlaceholder'
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
              {t('finance.paymentMethods.dialog.sortOrderLabel')}
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
              {t('finance.paymentMethods.dialog.statusLabel')}
            </Label>
            <select
              value={formData.status || 'Active'}
              onChange={(e) => {
                updateFormData({
                  status: e.target.value as PaymentMethod['status'],
                })
              }}
              className='h-12 w-full appearance-none rounded-2xl border border-dashed border-muted/20 bg-muted/5 px-4 text-[12px] font-bold shadow-sm focus:ring-2 focus:ring-primary/20'
            >
              <option value='Active'>
                {t('finance.paymentMethods.status.active')}
              </option>
              <option value='Inactive'>
                {t('finance.paymentMethods.status.inactive')}
              </option>
            </select>
          </div>
        </div>

        <div className='flex items-center justify-between rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-4'>
          <div className='space-y-0.5'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-primary uppercase'>
              <CreditCard className='size-3' />{' '}
              {t('finance.paymentMethods.card.defaultBadge')}
            </Label>
            <p className='text-[8px] font-bold tracking-widest text-muted-foreground/60 uppercase'>
              {t('finance.paymentMethods.dialog.defaultHint')}
            </p>
          </div>
          <Switch
            checked={formData.isDefault}
            onCheckedChange={(checked) => {
              updateFormData({ isDefault: checked })
            }}
          />
        </div>

        <div className='flex items-center gap-3 rounded-2xl border border-dashed border-muted/20 bg-muted/10 p-4'>
          <Info className='size-4 shrink-0 text-muted-foreground' />
          <p className='text-[8px] font-bold tracking-widest text-muted-foreground/70 uppercase'>
            {t('finance.paymentMethods.dialog.codeLockedHint')}
          </p>
        </div>
      </div>
    </ActionDialogShell>
  )
}
