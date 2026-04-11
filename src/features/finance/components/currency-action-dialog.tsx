import { useMemo } from 'react'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Star, RefreshCcw, Coins } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { CurrencyMaintenanceService, type CreateCurrencyPayload } from '../services/currency-maintenance-service'
import { type Currency } from '../data/schema'
import { PRESET_CURRENCIES } from '../data/currency-constants'
import { isConflictError } from '@/lib/handle-server-error'

interface CurrencyActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editingCurrency: Currency | null
    currencies: Currency[]
    onSuccess: () => Promise<unknown> | unknown
}

const DEFAULT_CURRENCY: Partial<Currency> = {
    code: '',
    name: '',
    symbol: '',
    rate: 1.0,
    precision: 2,
    status: 'Active',
    isBase: false,
}

export function CurrencyActionDialog({
    open,
    onOpenChange,
    editingCurrency,
    currencies,
    onSuccess
}: CurrencyActionDialogProps) {
    const { t } = useLanguage()
    const isEdit = !!editingCurrency
    const baseCurrency = useMemo(
        () => currencies.find(currency => currency.isBase) ?? null,
        [currencies]
    )
    const baseCurrencyCode = baseCurrency?.code || 'CNY'
    
    const shellClasses = buildActionDialogShellClasses({
        content: 'max-w-[95vw] sm:max-w-[500px] rounded-[32px]',
        header: 'p-8 pb-4 border-none bg-muted/5',
        title: 'text-xl font-black italic tracking-tighter uppercase flex items-center gap-3',
        description: 'text-[10px] font-bold uppercase tracking-widest opacity-50',
        body: 'p-8 pt-4 space-y-6',
        footer: 'p-6 bg-muted/5 border-t border-dashed border-muted/20 flex items-center justify-end gap-3',
    })

    const initialFormData = useMemo(() => (editingCurrency ? editingCurrency : (DEFAULT_CURRENCY as Currency)), [editingCurrency])
    const { data: formData, tracker } = useDeltaTracker(initialFormData, open)

    const handleSave = async () => {
        if (!formData.code) return

        try {
            const isPatch = isEdit
            const data = {
                ...formData,
                code: formData.code.trim().toUpperCase(),
                name: formData.name.trim(),
                symbol: formData.symbol.trim(),
                id: editingCurrency?.id,
                isBase: editingCurrency?.isBase || false
            } as Currency

            if (isPatch && editingCurrency?.id) {
                const delta = tracker.commit()
                if (Object.keys(delta).length === 0) {
                    onOpenChange(false)
                    return
                }
                await CurrencyMaintenanceService.patchCurrency(editingCurrency.id, delta, editingCurrency.version)
            } else {
                const createPayload: CreateCurrencyPayload = {
                    code: data.code,
                    name: data.name,
                    symbol: data.symbol,
                    rate: data.rate,
                    precision: data.precision,
                    status: data.status,
                    isBase: data.isBase,
                }
                await CurrencyMaintenanceService.saveCurrency(createPayload)
            }
            
            toast.success(isPatch 
                ? t('finance.currencyRates.toast.saveSuccessUpdated') 
                : t('finance.currencyRates.toast.saveSuccessCreated'))
            
            await onSuccess()
            onOpenChange(false)
        } catch (error) {
            if (isConflictError(error)) {
                toast.error(t('finance.paymentTerms.toast.conflict'))
                return
            }
            toast.error(t('finance.paymentTerms.toast.saveFailed'))
        }
    }

    const filteredPresets = PRESET_CURRENCIES.filter(
        preset => !currencies.some(curr => curr.code === preset.code)
    )

    return (
        <ActionDialogShell
            open={open}
            onOpenChange={onOpenChange}
            title={(
                <>
                    <Coins className='size-6 text-primary' />
                    {isEdit ? t('finance.currencyRates.dialog.editTitle') : t('finance.currencyRates.dialog.createTitle')}
                </>
            )}
            description={t('finance.currencyRates.dialog.templateHint')}
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
                        disabled={!formData.code}
                        className='rounded-full h-12 px-10 font-black uppercase tracking-widest shadow-lg shadow-primary/20 bg-primary text-primary-foreground'
                    >
                        {isEdit ? t('finance.currencyRates.dialog.save') : t('finance.currencyRates.dialog.confirm')}
                    </Button>
                </>
            )}
        >
            <div className='space-y-6'>
                {!isEdit && (
                    <div className='space-y-3 p-4 rounded-2xl bg-emerald-500/5 border border-dashed border-emerald-500/20'>
                        <Label className='text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-emerald-600'>
                            <Star className='size-3 animate-pulse' /> {t('finance.currencyRates.dialog.templateLabel')}
                        </Label>
                        <Select onValueChange={(val) => {
                            const preset = PRESET_CURRENCIES.find(p => p.code === val)
                            if (preset) {
                                formData.code = preset.code
                                formData.name = t(`finance.currencyRates.names.${preset.code}` as any)
                                formData.symbol = preset.symbol
                                formData.precision = preset.precision
                            }
                        }}>
                            <SelectTrigger className='rounded-2xl h-12 border-none bg-white shadow-sm font-bold'>
                                <SelectValue placeholder={t('finance.currencyRates.dialog.templatePlaceholder')} />
                            </SelectTrigger>
                            <SelectContent className='rounded-2xl border-none shadow-2xl'>
                                {filteredPresets.map(p => (
                                    <SelectItem key={p.code} value={p.code} className='rounded-xl py-3'>
                                        <span className='font-black italic'>{p.code}</span> - {t(`finance.currencyRates.names.${p.code}` as any)} ({p.symbol})
                                    </SelectItem>
                                ))}
                                {filteredPresets.length === 0 && (
                                    <div className='p-4 text-center text-[10px] font-bold text-muted-foreground uppercase italic'>
                                        {t('finance.currencyRates.dialog.allTemplatesAdded')}
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                        <Label className='text-[10px] font-black uppercase tracking-widest pl-1 opacity-50'>{t('finance.currencyRates.dialog.codeLabel')}</Label>
                        <Input 
                            placeholder={t('finance.currencyRates.dialog.codePlaceholder')} 
                            value={formData.code}
                            readOnly={isEdit || !!formData.code}
                            onChange={e => { formData.code = e.target.value.toUpperCase() }}
                            className={`rounded-2xl h-12 font-black italic ${ (isEdit || formData.code) ? 'bg-muted/30 border-none' : 'bg-muted/50'}`} 
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-[10px] font-black uppercase tracking-widest pl-1 opacity-50'>{t('finance.currencyRates.dialog.nameLabel')}</Label>
                        <Input 
                            placeholder={t('finance.currencyRates.dialog.namePlaceholder')} 
                            value={formData.name}
                            readOnly={!!formData.code && !isEdit}
                            onChange={e => { formData.name = e.target.value }}
                            className={`rounded-2xl h-12 font-bold ${ (formData.code && !isEdit) ? 'bg-muted/30 border-none' : 'bg-muted/50'}`} 
                        />
                    </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                        <Label className='text-[10px] font-black uppercase tracking-widest pl-1 opacity-50'>{t('finance.currencyRates.dialog.symbolLabel')}</Label>
                        <Input 
                            placeholder={t('finance.currencyRates.dialog.symbolPlaceholder')} 
                            value={formData.symbol}
                            readOnly={!!formData.code && !isEdit}
                            onChange={e => { formData.symbol = e.target.value }}
                            className={`rounded-2xl h-12 font-bold ${ (formData.code && !isEdit) ? 'bg-muted/30 border-none' : 'bg-muted/50'}`} 
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-[10px] font-black uppercase tracking-widest pl-1 opacity-50'>{t('finance.currencyRates.dialog.precisionLabel')}</Label>
                        <Input 
                            type='number' 
                            value={formData.precision}
                            readOnly={!!formData.code && !isEdit}
                            onChange={e => { formData.precision = parseInt(e.target.value) }}
                            className={`rounded-2xl h-12 font-mono font-bold ${ (formData.code && !isEdit) ? 'bg-muted/30 border-none' : 'bg-muted/50'}`} 
                        />
                    </div>
                </div>

                {isEdit ? (
                    <div className='space-y-3'>
                        <Label className='text-[10px] font-black uppercase tracking-widest pl-1'>{t('finance.currencyRates.dialog.rateLabel')}</Label>
                        <div className='relative'>
                            <Input 
                                type='number' 
                                step='0.0001'
                                disabled={editingCurrency?.isBase}
                                value={formData.rate}
                                onChange={e => { formData.rate = parseFloat(e.target.value) }}
                                className='rounded-2xl h-12 text-emerald-600 font-black italic border-dashed border-emerald-500/30 bg-emerald-500/5' 
                            />
                            {editingCurrency?.isBase && (
                                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                                    <span className='text-[8px] font-black bg-emerald-600 text-white px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm'>
                                        {t('finance.currencyRates.dialog.rateLocked')}
                                    </span>
                                </div>
                            )}
                        </div>
                        {editingCurrency?.isBase ? (
                            <p className='text-[8px] font-bold text-orange-500 uppercase tracking-widest pl-1 flex items-center gap-2'>
                                <span className='size-1 rounded-full bg-orange-500 animate-pulse' />
                                {t('finance.currencyRates.dialog.baseRateHint')}
                            </p>
                        ) : (
                            <p className='text-[8px] font-bold text-muted-foreground/60 uppercase tracking-widest pl-1 mt-2 leading-relaxed'>
                                {t('finance.currencyRates.dialog.manualRateWarning')}
                            </p>
                        )}
                        <p className='text-[9px] font-bold text-muted-foreground/70 pl-1 tracking-wide'>
                            {`1 ${formData.code || 'CUR'} = ${(formData.rate ?? 1).toFixed(4)} ${baseCurrencyCode}`}
                        </p>
                    </div>
                ) : (
                    <div className='p-5 rounded-2xl bg-amber-500/5 border border-dashed border-amber-500/20 flex gap-4 items-start'>
                        <div className='p-2 bg-amber-500/10 rounded-xl'>
                            <RefreshCcw className='size-4 text-amber-600 animate-spin-slow' />
                        </div>
                        <div className='space-y-1.5'>
                            <p className='text-[10px] font-black text-amber-600 uppercase tracking-tight italic'>{t('finance.currencyRates.dialog.syncModeTitle')}</p>
                            <p className='text-[8px] font-bold text-amber-600/60 leading-relaxed uppercase tracking-widest'>
                                {t('finance.currencyRates.dialog.syncModeDesc')}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </ActionDialogShell>
    )
}
