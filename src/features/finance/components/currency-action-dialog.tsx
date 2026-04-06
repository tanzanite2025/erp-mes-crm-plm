import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'
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
import { Star, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { financeService, type Currency } from '../services/finance-service'
import { PRESET_CURRENCIES } from '../data/currency-constants'
import { isConflictError } from '@/lib/handle-server-error'

interface CurrencyActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    editingCurrency: Currency | null
    currencies: Currency[]
    onSuccess: () => void
}

export function CurrencyActionDialog({
    open,
    onOpenChange,
    editingCurrency,
    currencies,
    onSuccess
}: CurrencyActionDialogProps) {
    const { t } = useLanguage()
    const [formData, setFormData] = useState<Omit<Currency, 'id' | 'isBase'>>({
        code: '',
        name: '',
        symbol: '',
        rate: 1.0,
        precision: 2,
        status: 'Active'
    })

    useEffect(() => {
        if (editingCurrency) {
            setFormData({
                code: editingCurrency.code,
                name: editingCurrency.name,
                symbol: editingCurrency.symbol,
                rate: editingCurrency.rate,
                precision: editingCurrency.precision,
                status: editingCurrency.status
            })
        } else {
            setFormData({ code: '', name: '', symbol: '', rate: 1.0, precision: 2, status: 'Active' })
        }
    }, [editingCurrency, open])

    const handleSave = async () => {
        try {
            await financeService.saveCurrency({
                ...formData,
                code: formData.code.trim().toUpperCase(),
                name: formData.name.trim(),
                symbol: formData.symbol.trim(),
                id: editingCurrency?.id,
                isBase: editingCurrency?.isBase || false
            } as Currency)
            
            toast.success(editingCurrency 
                ? t('finance.currencyRates.toast.saveSuccessUpdated') 
                : t('finance.currencyRates.toast.saveSuccessCreated'))
            
            window.dispatchEvent(new CustomEvent('xdfc_currencies_data_updated'))
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

    const filteredPresets = PRESET_CURRENCIES.filter(
        preset => !currencies.some(curr => curr.code === preset.code)
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='rounded-[32px] border-none shadow-2xl max-w-md'>
                <DialogHeader>
                    <DialogTitle className='font-black italic tracking-tighter uppercase'>
                        {editingCurrency ? t('finance.currencyRates.dialog.editTitle') : t('finance.currencyRates.dialog.createTitle')}
                    </DialogTitle>
                </DialogHeader>
                <div className='space-y-6 py-4'>
                    {!editingCurrency && (
                        <div className='space-y-2 p-4 rounded-2xl bg-emerald-500/5 border border-dashed border-emerald-500/20'>
                            <Label className='text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-emerald-600'>
                                <Star className='size-3' /> {t('finance.currencyRates.dialog.templateLabel')}
                            </Label>
                            <Select onValueChange={(val) => {
                                const preset = PRESET_CURRENCIES.find(p => p.code === val)
                                if (preset) {
                                    setFormData({
                                        ...formData,
                                        code: preset.code,
                                        name: t(`finance.currencyRates.names.${preset.code}` as any),
                                        symbol: preset.symbol,
                                        precision: preset.precision
                                    })
                                }
                            }}>
                                <SelectTrigger className='rounded-2xl h-12 border-none bg-white shadow-sm'>
                                    <SelectValue placeholder={t('finance.currencyRates.dialog.templatePlaceholder')} />
                                </SelectTrigger>
                                <SelectContent className='rounded-2xl border-none shadow-2xl'>
                                    {filteredPresets.map(p => (
                                        <SelectItem key={p.code} value={p.code} className='rounded-xl'>
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
                            <p className='text-[8px] font-bold text-emerald-600/60 uppercase tracking-widest pl-1 mt-1'>
                                {t('finance.currencyRates.dialog.templateHint')}
                            </p>
                        </div>
                    )}

                    <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                            <Label className='text-[10px] font-black uppercase tracking-widest pl-1 opacity-50'>{t('finance.currencyRates.dialog.codeLabel')}</Label>
                            <Input 
                                placeholder={t('finance.currencyRates.dialog.codePlaceholder')} 
                                value={formData.code}
                                readOnly={!!editingCurrency || !!formData.code}
                                onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                className={`rounded-2xl h-11 ${ (editingCurrency || formData.code) ? 'bg-muted/30 border-none' : ''}`} 
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-[10px] font-black uppercase tracking-widest pl-1 opacity-50'>{t('finance.currencyRates.dialog.nameLabel')}</Label>
                            <Input 
                                placeholder={t('finance.currencyRates.dialog.namePlaceholder')} 
                                value={formData.name}
                                readOnly={!!formData.code && !editingCurrency}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className={`rounded-2xl h-11 ${ (formData.code && !editingCurrency) ? 'bg-muted/30 border-none' : ''}`} 
                            />
                        </div>
                    </div>

                    <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                            <Label className='text-[10px] font-black uppercase tracking-widest pl-1 opacity-50'>{t('finance.currencyRates.dialog.symbolLabel')}</Label>
                            <Input 
                                placeholder={t('finance.currencyRates.dialog.symbolPlaceholder')} 
                                value={formData.symbol}
                                readOnly={!!formData.code && !editingCurrency}
                                onChange={e => setFormData({...formData, symbol: e.target.value})}
                                className={`rounded-2xl h-11 ${ (formData.code && !editingCurrency) ? 'bg-muted/30 border-none' : ''}`} 
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-[10px] font-black uppercase tracking-widest pl-1 opacity-50'>{t('finance.currencyRates.dialog.precisionLabel')}</Label>
                            <Input 
                                type='number' 
                                value={formData.precision}
                                readOnly={!!formData.code && !editingCurrency}
                                onChange={e => setFormData({...formData, precision: parseInt(e.target.value)})}
                                className={`rounded-2xl h-11 ${ (formData.code && !editingCurrency) ? 'bg-muted/30 border-none' : ''}`} 
                            />
                        </div>
                    </div>

                    {editingCurrency ? (
                        <div className='space-y-2'>
                            <Label className='text-[10px] font-black uppercase tracking-widest pl-1'>{t('finance.currencyRates.dialog.rateLabel')}</Label>
                            <div className='relative'>
                                <Input 
                                    type='number' 
                                    step='0.0001'
                                    disabled={editingCurrency?.isBase}
                                    value={formData.rate}
                                    onChange={e => setFormData({...formData, rate: parseFloat(e.target.value)})}
                                    className='rounded-2xl h-11 text-emerald-600 font-bold border-dashed border-emerald-500/30 bg-emerald-500/5' 
                                />
                                <div className='absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2'>
                                    <span className='text-[8px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter'>{t('finance.currencyRates.dialog.rateLocked')}</span>
                                </div>
                            </div>
                            {editingCurrency?.isBase && (
                                <p className='text-[8px] font-bold text-orange-500 uppercase tracking-widest pl-1'>{t('finance.currencyRates.dialog.baseRateHint')}</p>
                            )}
                            <p className='text-[8px] font-bold text-muted-foreground/60 uppercase tracking-widest pl-1'>
                                {t('finance.currencyRates.dialog.manualRateWarning')}
                            </p>
                        </div>
                    ) : (
                        <div className='p-4 rounded-2xl bg-amber-500/5 border border-dashed border-amber-500/20 flex gap-3 items-start'>
                            <RefreshCcw className='size-4 text-amber-600 mt-0.5 animate-pulse' />
                            <div className='space-y-1'>
                                <p className='text-[10px] font-black text-amber-600 uppercase tracking-tight'>{t('finance.currencyRates.dialog.syncModeTitle')}</p>
                                <p className='text-[8px] font-bold text-amber-600/70 leading-relaxed uppercase tracking-widest'>
                                    {t('finance.currencyRates.dialog.syncModeDesc')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button 
                        onClick={handleSave} 
                        disabled={!formData.code}
                        className='rounded-full w-full font-black uppercase tracking-widest h-12 shadow-lg shadow-primary/20'
                    >
                        {editingCurrency ? t('finance.currencyRates.dialog.save') : t('finance.currencyRates.dialog.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
