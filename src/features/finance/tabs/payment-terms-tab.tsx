import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCcw, CreditCard, Edit2 } from 'lucide-react'
import { PaymentTermCoreService } from '../services/payment-term-core-service'
import { type PaymentTerm } from '../data/schema'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { PaymentTermActionDialog } from '../components/payment-term-action-dialog'
import { financeQueryKeys } from '../query-keys'

const logger = createLogger('PaymentTermsTab')

export function PaymentTermsTab() {
    const { t } = useLanguage()
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null)

    const termsQuery = useQuery({
        queryKey: financeQueryKeys.paymentTerms(),
        queryFn: () => PaymentTermCoreService.getPaymentTerms(),
    })

    useEffect(() => {
        if (!termsQuery.error) return
        logger.error('Failed to load payment terms in PaymentTermsTab', termsQuery.error)
        toast.error(t('finance.paymentTerms.toast.loadFailed'))
    }, [termsQuery.error, t])

    const refresh = () => queryClient.invalidateQueries({ queryKey: financeQueryKeys.paymentTerms() })

    const openEdit = (term: PaymentTerm) => {
        setEditingTerm(term)
        setIsDialogOpen(true)
    }

    const openAdd = () => {
        setEditingTerm(null)
        setIsDialogOpen(true)
    }

    if (isForbiddenError(termsQuery.error)) {
        return <ForbiddenState />
    }

    const getCardLabelKey = (code: string): Parameters<typeof t>[0] => `finance.paymentTerms.card.labels.${code}` as Parameters<typeof t>[0]
    const getCardDescriptionKey = (code: string): Parameters<typeof t>[0] => `finance.paymentTerms.card.descriptions.${code}` as Parameters<typeof t>[0]
    const terms = termsQuery.data ?? []
    const isLoading = termsQuery.isLoading || termsQuery.isFetching

    return (
        <div className='space-y-6 animate-in fade-in duration-700'>
            <IndustrialHeader
                icon={CreditCard}
                title={t('finance.paymentTerms.page.title')}
                description={t('finance.paymentTerms.page.subtitle')}
            />

            <div className='flex flex-col md:flex-row md:items-center justify-end gap-4'>
                <div className='flex flex-wrap items-center gap-2'>
                    <Button 
                        variant='outline' 
                        size='sm' 
                        onClick={() => void refresh()}
                        className='rounded-full h-9 font-black text-[10px] uppercase tracking-widest border-dashed hover:bg-primary/5 hover:text-primary transition-all'
                    >
                        <RefreshCcw className={`size-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        {t('finance.paymentTerms.page.refresh')}
                    </Button>
                    <Button 
                        size='sm' 
                        onClick={openAdd}
                        className='rounded-full h-9 font-black text-[10px] uppercase tracking-widest bg-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all'
                    >
                        <Plus className='size-3 mr-2' />
                        {t('finance.paymentTerms.page.addPlan')}
                    </Button>
                </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
                {terms.map((term) => (
                    <Card key={term.id} className='rounded-[24px] border-dashed border-primary/20 bg-muted/5 group hover:bg-muted/10 transition-all'>
                        <CardHeader className='pb-1 pt-3 px-4'>
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-2.5'>
                                    <div className='size-7 rounded-xl bg-primary/10 flex items-center justify-center'>
                                        <CreditCard className='size-3.5 text-primary' />
                                    </div>
                                    <div>
                                        <CardTitle className='text-sm font-black italic tracking-tighter uppercase'>
                                            {(() => {
                                                const translatedName = t(getCardLabelKey(term.code))
                                                return translatedName.includes('finance.paymentTerms.card.labels') ? term.name : translatedName
                                            })()}
                                        </CardTitle>
                                        <CardDescription className='text-[8px] font-black tracking-widest font-mono text-muted-foreground uppercase opacity-50'>
                                            {t('finance.paymentTerms.card.codePrefix')}: {term.code}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Button 
                                    variant='ghost' 
                                    size='icon' 
                                    onClick={() => openEdit(term)}
                                    className='size-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10 hover:text-primary'
                                >
                                    <Edit2 className='size-3' />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className='pt-1'>
                            <div className='space-y-2'>
                                <div className='p-2 bg-background rounded-xl border border-dashed border-muted/20 text-[10px] font-medium leading-relaxed min-h-[36px] text-muted-foreground/80'>
                                    {(() => {
                                        const translatedDesc = t(getCardDescriptionKey(term.code))
                                        return translatedDesc.includes('finance.paymentTerms.card.descriptions') ? (term.description || t('finance.paymentTerms.card.emptyDescription')) : translatedDesc
                                    })()}
                                </div>
                                <div className='flex flex-wrap items-center gap-1.5'>
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${term.isDefault ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground opacity-50'}`}>
                                        {term.isDefault
                                            ? t('finance.paymentTerms.card.defaultBadge')
                                            : t('finance.paymentTerms.card.optionalBadge')}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${term.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                                        {term.status === 'Active' ? t('finance.paymentTerms.status.active') : t('finance.paymentTerms.status.inactive')}
                                    </span>
                                    {term.isSystem ? (
                                        <span className='px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 border border-blue-500/20'>
                                            {t('finance.paymentTerms.card.systemBadge')}
                                        </span>
                                    ) : null}
                                    <span className='text-[8px] font-black tracking-widest uppercase text-muted-foreground/40 ml-auto'>
                                        {t('finance.paymentTerms.card.sortOrder', { sortOrder: term.sortOrder ?? 0 })}
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

            <PaymentTermActionDialog 
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingTerm={editingTerm}
            />
        </div>
    )
}
