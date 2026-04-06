import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter 
} from '@/components/ui/dialog'
import { Plus, RefreshCcw, CreditCard, Edit2 } from 'lucide-react'
import { financeService, type PaymentTerm } from '../services/finance-service'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { isForbiddenError } from '@/lib/error-status'
import { isConflictError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'

const logger = createLogger('PaymentTermsTab')

export function PaymentTermsTab() {
    const { t } = useLanguage()
    const [terms, setTerms] = useState<PaymentTerm[]>([])
    const [error, setError] = useState<unknown>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null)
    const [formData, setFormData] = useState<Omit<PaymentTerm, 'id'>>({
        code: '',
        name: '',
        description: '',
        isDefault: false,
        status: 'Active'
    })

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const data = await financeService.getPaymentTerms()
            // 此时 data 保证为数组，如果后端返回非数组，financeService 会抛出 [INVALID_RESPONSE]
            setTerms(data)
        } catch (error) {
            setError(error)
            logger.error('Failed to load payment terms in PaymentTermsTab', error)
            toast.error(t('finance.paymentTerms.toast.loadFailed'))
        } finally {
            setIsLoading(false)
        }
    }, [t])

    useEffect(() => {
        let cancelled = false

        void Promise.resolve()
            .then(() => financeService.getPaymentTerms())
            .then((data) => {
                if (cancelled) {
                    return
                }

                setError(null)
                setTerms(data)
                setIsLoading(false)
            })
            .catch((error) => {
                if (cancelled) {
                    return
                }

                setError(error)
                logger.error('Failed to load payment terms in PaymentTermsTab', error)
                toast.error(t('finance.paymentTerms.toast.loadFailed'))
                setIsLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [t])

    const handleSave = async () => {
        try {
            await financeService.savePaymentTerm({
                ...formData,
                id: editingTerm?.id
            } as PaymentTerm)
            toast.success(
                editingTerm
                    ? t('finance.paymentTerms.toast.saveSuccessUpdated')
                    : t('finance.paymentTerms.toast.saveSuccessCreated')
            )
            setIsDialogOpen(false)
            setEditingTerm(null)
            loadData()
        } catch (error) {
            if (isConflictError(error)) {
                toast.error(t('finance.paymentTerms.toast.conflict'))
                return
            }
            toast.error(t('finance.paymentTerms.toast.saveFailed'))
        }
    }

    const openEdit = (term: PaymentTerm) => {
        setEditingTerm(term)
        setFormData({
            code: term.code,
            name: term.name,
            description: term.description,
            isDefault: term.isDefault,
            status: term.status
        })
        setIsDialogOpen(true)
    }

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    const getCardLabelKey = (code: string): Parameters<typeof t>[0] => `finance.paymentTerms.card.labels.${code}` as Parameters<typeof t>[0]
    const getCardDescriptionKey = (code: string): Parameters<typeof t>[0] => `finance.paymentTerms.card.descriptions.${code}` as Parameters<typeof t>[0]

    return (
        <div className='space-y-6 animate-in fade-in duration-700'>
            <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                <div className='flex-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
                    <h2 className='text-lg font-black italic tracking-tighter uppercase'>{t('finance.paymentTerms.page.title')}</h2>
                    <p className='text-[10px] text-muted-foreground font-black tracking-widest uppercase opacity-60'>{t('finance.paymentTerms.page.subtitle')}</p>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                    <Button 
                        variant='outline' 
                        size='sm' 
                        onClick={loadData}
                        className='rounded-full h-9 font-black text-[10px] uppercase tracking-widest border-dashed'
                    >
                        <RefreshCcw className={`size-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        {t('finance.paymentTerms.page.refresh')}
                    </Button>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button 
                                size='sm' 
                                onClick={() => {
                                    setEditingTerm(null)
                                    setFormData({ code: '', name: '', description: '', isDefault: false, status: 'Active' })
                                }}
                                className='rounded-full h-9 font-black text-[10px] uppercase tracking-widest bg-primary shadow-lg shadow-primary/20'
                            >
                                <Plus className='size-3 mr-2' />
                                {t('finance.paymentTerms.page.addPlan')}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className='rounded-[32px] border-none shadow-2xl'>
                            <DialogHeader>
                                <DialogTitle className='font-black italic tracking-tighter uppercase'>
                                    {editingTerm
                                        ? t('finance.paymentTerms.dialog.editTitle')
                                        : t('finance.paymentTerms.dialog.createTitle')}
                                </DialogTitle>
                            </DialogHeader>
                            <div className='space-y-4 py-4'>
                                <div className='grid grid-cols-2 gap-4'>
                                    <div className='space-y-2'>
                                        <Label className='text-[10px] font-black uppercase tracking-widest pl-1'>{t('finance.paymentTerms.dialog.codeLabel')}</Label>
                                        <Input 
                                            placeholder={t('finance.paymentTerms.dialog.codePlaceholder')} 
                                            value={formData.code}
                                            onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                                            className='rounded-2xl h-11' 
                                        />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label className='text-[10px] font-black uppercase tracking-widest pl-1'>{t('finance.paymentTerms.dialog.nameLabel')}</Label>
                                        <Input 
                                            placeholder={t('finance.paymentTerms.dialog.namePlaceholder')} 
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            className='rounded-2xl h-11' 
                                        />
                                    </div>
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-[10px] font-black uppercase tracking-widest pl-1'>{t('finance.paymentTerms.dialog.descriptionLabel')}</Label>
                                    <Textarea 
                                        placeholder={t('finance.paymentTerms.dialog.descriptionPlaceholder')} 
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        className='rounded-2xl min-h-[80px]' 
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleSave} className='rounded-full w-full font-black uppercase tracking-widest h-11'>
                                    {t('finance.paymentTerms.dialog.save')}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
                {terms.map((term) => (
                    <Card key={term.id} className='rounded-[24px] border-dashed border-primary/20 bg-muted/5 group hover:bg-muted/10 transition-all'>
                        <CardHeader className='pb-2'>
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-3'>
                                    <div className='size-9 rounded-2xl bg-primary/10 flex items-center justify-center'>
                                        <CreditCard className='size-4 text-primary' />
                                    </div>
                                    <div>
                                        <CardTitle className='text-sm font-black italic tracking-tighter uppercase'>
                                            {(() => {
                                                const translatedName = t(getCardLabelKey(term.code))
                                                return translatedName.includes('finance.paymentTerms.card.labels') ? term.name : translatedName
                                            })()}
                                        </CardTitle>
                                        <CardDescription className='text-[8px] font-black tracking-widest font-mono text-muted-foreground uppercase'>
                                            {t('finance.paymentTerms.card.codePrefix')}: {term.code}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Button 
                                    variant='ghost' 
                                    size='icon' 
                                    onClick={() => openEdit(term)}
                                    className='size-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
                                >
                                    <Edit2 className='size-3' />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className='pt-2'>
                            <div className='space-y-3'>
                                <div className='p-3 bg-background rounded-2xl border border-dashed text-[10px] font-medium leading-relaxed min-h-[60px] text-muted-foreground/80'>
                                    {(() => {
                                        const translatedDesc = t(getCardDescriptionKey(term.code))
                                        return translatedDesc.includes('finance.paymentTerms.card.descriptions') ? (term.description || t('finance.paymentTerms.card.emptyDescription')) : translatedDesc
                                    })()}
                                </div>
                                <div className='flex items-center gap-2'>
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${term.isDefault ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground opacity-50'}`}>
                                        {term.isDefault
                                            ? t('finance.paymentTerms.card.defaultBadge')
                                            : t('finance.paymentTerms.card.optionalBadge')}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            {/* 业务提示辅助卡片 */}
            <Card className='rounded-[32px] border-dashed border-orange-500/20 bg-orange-500/5 p-6'>
                <div className='flex gap-4 items-start text-orange-600'>
                    <div className='p-3 rounded-full bg-white/50 shadow-sm'>
                        <CreditCard className='size-5' />
                    </div>
                    <div className='space-y-1'>
                        <h4 className='text-xs font-black italic tracking-tight uppercase'>{t('finance.paymentTerms.guard.title')}</h4>
                        <p className='text-[10px] font-medium leading-relaxed max-w-3xl opacity-80'>
                            {t('finance.paymentTerms.guard.content')}
                            {' '}
                            {t('finance.paymentTerms.guard.warning')}
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    )
}
