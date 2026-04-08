import { useMemo } from 'react'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { CreditCard, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { PaymentTermMaintenanceService } from '../services/payment-term-maintenance-service'
import { type PaymentTerm } from '../data/schema'
import { isConflictError } from '@/lib/handle-server-error'

interface PaymentTermActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editingTerm: PaymentTerm | null
    onSuccess: () => void
}

const DEFAULT_TERM: Partial<PaymentTerm> = {
    code: '',
    name: '',
    description: '',
    installments: '',
    isDefault: false,
    status: 'Active',
    version: 1,
}

export function PaymentTermActionDialog({
    open,
    onOpenChange,
    editingTerm,
    onSuccess
}: PaymentTermActionDialogProps) {
    const { t } = useLanguage()
    const isEdit = !!editingTerm
    
    const shellClasses = buildActionDialogShellClasses({
        content: 'max-w-[95vw] sm:max-w-[500px] rounded-[32px]',
        header: 'p-8 pb-4 border-none bg-muted/5',
        title: 'text-xl font-black italic tracking-tighter uppercase flex items-center gap-3',
        description: 'text-[10px] font-bold uppercase tracking-widest opacity-50',
        body: 'p-8 pt-4 space-y-6',
        footer: 'p-6 bg-muted/5 border-t border-dashed border-muted/20 flex items-center justify-end gap-3',
    })

    const initialFormData = useMemo(() => (editingTerm ? editingTerm : (DEFAULT_TERM as PaymentTerm)), [editingTerm])
    const { data: formData, tracker } = useDeltaTracker(initialFormData, open)

    const handleSave = async () => {
        if (!formData.code || !formData.name) {
            toast.error(t('finance.paymentTerms.toast.formIncomplete' as any) || '请填写完整信息')
            return
        }

        try {
            const isPatch = isEdit
            const data = {
                ...formData,
                code: formData.code.trim().toUpperCase(),
                name: formData.name.trim(),
                description: formData.description?.trim() || '',
                id: editingTerm?.id,
            } as PaymentTerm

            if (isPatch && editingTerm?.id) {
                const delta = tracker.commit()
                if (Object.keys(delta).length === 0) {
                    onOpenChange(false)
                    return
                }
                await PaymentTermMaintenanceService.patchPaymentTerm(editingTerm.id, delta, editingTerm.version)
            } else {
                await PaymentTermMaintenanceService.savePaymentTerm(data)
            }
            
            toast.success(isPatch 
                ? t('finance.paymentTerms.toast.saveSuccessUpdated') 
                : t('finance.paymentTerms.toast.saveSuccessCreated'))
            
            onOpenChange(false)
            onSuccess()
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
            title={(
                <>
                    <CreditCard className='size-6 text-primary' />
                    {isEdit ? t('finance.paymentTerms.dialog.editTitle') : t('finance.paymentTerms.dialog.createTitle')}
                </>
            )}
            description={t('finance.paymentTerms.page.subtitle')}
            contentClassName={shellClasses.content}
            headerClassName={shellClasses.header}
            bodyClassName={shellClasses.body}
            footerClassName={shellClasses.footer}
            titleClassName={shellClasses.title}
            descriptionClassName={shellClasses.description}
            footer={(
                <>
                    <Button 
                        variant='ghost'
                        onClick={() => onOpenChange(false)}
                        className='rounded-full h-12 px-8 font-black uppercase text-[10px] tracking-widest'
                    >
                        {t('common.actions.cancel')}
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        className='rounded-full h-12 px-10 font-black uppercase tracking-widest shadow-lg shadow-primary/20 bg-primary text-primary-foreground'
                    >
                        {isEdit ? t('finance.paymentTerms.dialog.save') : t('finance.paymentTerms.page.addPlan')}
                    </Button>
                </>
            )}
        >
            <div className='space-y-6'>
                <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                        <Label className='text-[10px] font-black uppercase tracking-widest pl-1 opacity-50'>{t('finance.paymentTerms.dialog.codeLabel')}</Label>
                        <Input 
                            placeholder={t('finance.paymentTerms.dialog.codePlaceholder')} 
                            value={formData.code}
                            onChange={e => { formData.code = e.target.value.toUpperCase() }}
                            className='rounded-2xl h-12 font-black italic bg-muted/5' 
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-[10px] font-black uppercase tracking-widest pl-1 opacity-50'>{t('finance.paymentTerms.dialog.nameLabel')}</Label>
                        <Input 
                            placeholder={t('finance.paymentTerms.dialog.namePlaceholder')} 
                            value={formData.name}
                            onChange={e => { formData.name = e.target.value }}
                            className='rounded-2xl h-12 font-bold bg-muted/5' 
                        />
                    </div>
                </div>

                <div className='space-y-2'>
                    <Label className='text-[10px] font-black uppercase tracking-widest pl-1 opacity-50'>{t('finance.paymentTerms.dialog.descriptionLabel')}</Label>
                    <Textarea 
                        placeholder={t('finance.paymentTerms.dialog.descriptionPlaceholder')} 
                        value={formData.description}
                        onChange={e => { formData.description = e.target.value }}
                        className='rounded-2xl min-h-[100px] bg-muted/5 border-dashed focus:border-primary/50 transition-all' 
                    />
                </div>

                <div className='flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-dashed border-primary/20'>
                    <div className='space-y-0.5'>
                        <Label className='text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2'>
                            <CreditCard className='size-3' /> {t('finance.paymentTerms.card.defaultBadge')}
                        </Label>
                        <p className='text-[8px] font-bold text-muted-foreground/60 uppercase tracking-widest'>
                            设置为当前业务模块的常规首选方案
                        </p>
                    </div>
                    <Switch 
                        checked={formData.isDefault}
                        onCheckedChange={(checked) => { formData.isDefault = checked }}
                    />
                </div>

                <div className='flex items-center gap-3 p-4 bg-orange-500/5 rounded-2xl border border-dashed border-orange-500/20'>
                    <Info className='size-4 text-orange-500 shrink-0' />
                    <p className='text-[8px] font-bold text-orange-600/70 leading-relaxed uppercase tracking-widest'>
                        {t('finance.paymentTerms.guard.warning')}
                    </p>
                </div>
            </div>
        </ActionDialogShell>
    )
}
