'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Ban } from 'lucide-react'
import { type Mold } from '../../data/schema'
import { useLanguage } from '@/context/language-provider'

interface WarningListProps {
    molds: Mold[]
}

export const WarningList = ({ molds }: WarningListProps) => {
    const { t } = useLanguage()
    const faultMolds = molds.filter((mold) => mold.status === 'RETIRED')

    if (faultMolds.length === 0) return null

    return (
        <Card className='border-dashed border-rose-200 dark:border-rose-900/50 shadow-none overflow-hidden rounded-[24px] bg-rose-50/5'>
            <div className='h-10 px-4 border-b border-dashed border-rose-100 dark:border-rose-900/30 flex items-center gap-2 bg-rose-500/5'>
                <Ban className='size-4 text-rose-600 animate-pulse' />
                <span className='text-rose-600 text-[10px] font-black uppercase tracking-widest'>{t('equipmentTooling.dashboard.warnings.title')}</span>
            </div>
            <CardContent className='p-4'>
                <div className='space-y-2'>
                    {faultMolds.map((mold) => (
                        <div key={mold.id} className='flex items-center justify-between text-[11px] px-4 py-3 rounded-[16px] bg-rose-500/5 border border-dashed border-rose-200 dark:border-rose-900/30'>
                            <div className='flex items-center gap-3'>
                                <span className='font-mono font-bold text-rose-700/60 text-[10px]'>{mold.sn}</span>
                                <span className='font-black text-rose-900/80'>{mold.name}</span>
                            </div>
                            <Badge variant='outline' className='rounded-full h-5 text-[8px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-600 border-rose-500/20'>
                                {t('equipmentTooling.dashboard.warnings.retired')}
                            </Badge>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
