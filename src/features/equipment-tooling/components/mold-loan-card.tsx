'use client'

import { Clock, CheckCircle2, Truck, User, Factory, FileText, Camera } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type MoldLoan } from '../data/schema'
import { useLanguage } from '@/context/language-provider'

interface MoldLoanCardProps {
    loan: MoldLoan
    onReturn: (id: string) => void
}

export function MoldLoanCard({ loan, onReturn }: MoldLoanCardProps) {
    const { t } = useLanguage()

    const getLoanStatusLabel = (loan: MoldLoan) => {
        if (loan.status === 'RETURNED') return t('equipmentTooling.loans.status.returned')
        if (loan.status === 'OVERDUE') return t('equipmentTooling.loans.status.overdue')
        if (loan.moldId.startsWith('borrow-mold-')) return t('equipmentTooling.loans.status.borrowed')
        return t('equipmentTooling.loans.status.lent')
    }

    const statusColor = loan.status === 'RETURNED' ? '#22c55e' : (loan.status === 'OVERDUE' ? '#e11d48' : '#2563eb')

    return (
        <Card
            className={cn(
                'group overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all border-dashed rounded-[24px] border-l-8',
                loan.status === 'OVERDUE' ? 'bg-rose-50/20' : 'bg-muted/5'
            )}
            style={{ borderLeftColor: statusColor }}
        >
            <CardContent className='p-0'>
                <div className='flex flex-col lg:flex-row p-5 sm:p-8 gap-6 sm:gap-8'>
                    <div className='flex-1 space-y-6'>
                        <div className='flex flex-wrap items-center gap-3 sm:gap-4'>
                            <div className='px-2 py-0.5 bg-muted/50 rounded font-mono text-[9px] font-black border border-dashed border-muted-foreground/20 uppercase'>
                                {loan.moldSn}
                            </div>
                            <h3 className='text-base sm:text-xl font-black tracking-tighter truncate'>{loan.moldName}</h3>
                            <Badge
                                variant='outline'
                                className={cn(
                                    'rounded-full h-4 text-[8px] font-black uppercase border-none',
                                    loan.status === 'RETURNED' && 'bg-emerald-500/10 text-emerald-600',
                                    loan.status === 'OVERDUE' && 'bg-rose-500/10 text-rose-600 animate-pulse',
                                    loan.status === 'ACTIVE' && (loan.moldId.startsWith('borrow-mold-') ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600')
                                )}
                            >
                                {getLoanStatusLabel(loan)}
                            </Badge>
                        </div>

                        {loan.photoUrl && (
                            <div className='flex flex-col xs:flex-row gap-4 xs:items-center bg-white/40 p-3 rounded-2xl border border-dashed border-slate-200'>
                                <div className='size-16 sm:size-20 rounded-xl overflow-hidden border border-white bg-white shadow-sm shrink-0'>
                                    <img src={loan.photoUrl} alt={t('equipmentTooling.loans.card.photoTitle')} className='w-full h-full object-cover' />
                                </div>
                                <div className='space-y-1'>
                                    <p className='text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5'>
                                        <Camera className='size-3.5' /> {t('equipmentTooling.loans.card.photoTitle')}
                                    </p>
                                    <p className='text-[8px] text-muted-foreground/60 leading-tight max-w-[320px] uppercase font-bold'>
                                        {t('equipmentTooling.loans.card.photoDescription')}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10'>
                            <div className='space-y-2'>
                                <div className='flex items-center gap-2 text-[9px] uppercase font-black tracking-widest text-muted-foreground/40'>
                                    <Factory className='size-3' /> {t('equipmentTooling.loans.card.path')}
                                </div>
                                <div className='flex items-center gap-3'>
                                    <span className='text-xs sm:text-sm font-black truncate max-w-[80px]'>{loan.fromFactory}</span>
                                    <Truck className='size-3 text-muted-foreground/30' />
                                    <span className='text-xs sm:text-sm font-black text-blue-600 truncate max-w-[80px]'>{loan.toFactory}</span>
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <div className='flex items-center gap-2 text-[9px] uppercase font-black tracking-widest text-muted-foreground/40'>
                                    <User className='size-3' /> {t('equipmentTooling.loans.card.agent')}
                                </div>
                                <p className='text-xs sm:text-sm font-black'>{loan.contactPerson || '-'}</p>
                            </div>
                            <div className='space-y-2'>
                                <div className='flex items-center gap-2 text-[9px] uppercase font-black tracking-widest text-muted-foreground/40'>
                                    <Clock className='size-3' /> {t('equipmentTooling.loans.card.cycle')}
                                </div>
                                <div className='flex items-center gap-2'>
                                    <span className='text-[10px] font-mono font-bold'>{new Date(loan.loanDate).toLocaleDateString()}</span>
                                    <span className='text-muted-foreground/20 italic font-black'>-</span>
                                    <span
                                        className={cn(
                                            'text-[10px] font-mono font-bold',
                                            loan.status === 'OVERDUE' && 'text-rose-600 underline'
                                        )}
                                    >
                                        {new Date(loan.expectedReturnDate).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='flex flex-row lg:flex-col justify-center border-t lg:border-t-0 lg:border-l border-dashed border-slate-100 pt-6 lg:pt-0 lg:pl-8 mt-2 lg:mt-0'>
                        {loan.status === 'ACTIVE' ? (
                            <Button
                                variant='outline'
                                className='rounded-full border-dashed border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 gap-2 font-black text-[10px] uppercase tracking-widest h-11 px-6 shadow-sm active:scale-95 transition-all w-full'
                                onClick={() => onReturn(loan.id)}
                            >
                                <CheckCircle2 className='size-4' />
                                {t('equipmentTooling.loans.actions.return')}
                            </Button>
                        ) : loan.actualReturnDate && (
                            <div className='text-right lg:text-left space-y-1 w-full'>
                                <p className='text-[9px] text-muted-foreground/40 font-black uppercase tracking-widest'>
                                    {t('equipmentTooling.loans.card.returnDate')}
                                </p>
                                <p className='text-base sm:text-lg font-black text-emerald-600 tracking-tighter italic'>
                                    {new Date(loan.actualReturnDate).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                {loan.remarks && (
                    <div className='px-5 sm:px-8 py-3 bg-muted/20 border-t border-dashed border-slate-100 flex items-center gap-3 text-[9px] text-muted-foreground font-black'>
                        <FileText className='size-3 opacity-50' />
                        <span className='uppercase tracking-widest opacity-30'>{t('equipmentTooling.loans.card.memo')}</span>
                        {loan.remarks}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
