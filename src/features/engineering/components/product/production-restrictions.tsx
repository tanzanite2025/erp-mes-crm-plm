'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

interface ProductionRestrictionsProps {
    restrictions: string[]
    setRestrictions: (nextRestrictions: string[]) => void
}

export function ProductionRestrictions({ restrictions, setRestrictions }: ProductionRestrictionsProps) {
    const { t } = useLanguage()
    const [newTag, setNewTag] = useState('')

    const handleAddTag = (e?: React.MouseEvent) => {
        e?.preventDefault()
        if (!newTag.trim()) return
        const tags = [...restrictions]
        if (!tags.includes(newTag.trim())) {
            setRestrictions([...tags, newTag.trim()])
        }
        setNewTag('')
    }

    return (
        <div className='p-2 bg-muted/5 border border-dashed border-muted rounded-[20px] space-y-1 transition-all hover:bg-muted/10 group'>
            <div className='flex items-center justify-between border-b border-dashed border-muted pb-1'>
                <h4 className='text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest italic'>{t('engineering.productMgmt.restrictions.title')}</h4>
                <p className='text-[8px] font-black text-slate-500 uppercase tracking-tighter italic'>{t('engineering.productMgmt.restrictions.separator')}</p>
            </div>
            <div className='flex flex-col gap-2'>
                <div className='flex flex-wrap gap-1.5 min-h-[32px] p-1.5 bg-muted/20 rounded-xl border border-dashed border-muted/50 shadow-inner group-hover:bg-muted/30 transition-all'>
                    {restrictions.length > 0 ? (
                        restrictions.map((tag: string) => (
                            <Badge
                                key={tag}
                                variant='outline'
                                className='bg-rose-500 text-[10px] font-black uppercase text-white border-none gap-1.5 px-2 h-6 rounded-full shadow-md shadow-rose-500/10'
                            >
                                {tag}
                                <button
                                    type='button'
                                    onClick={() => setRestrictions(restrictions.filter((t: string) => t !== tag))}
                                    className='hover:scale-110 transition-transform'
                                >
                                    <X className='size-3 stroke-3' />
                                </button>
                            </Badge>
                        ))
                    ) : (
                        <div className='flex items-center gap-2 text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest px-1 italic'>
                            <span>{t('engineering.productMgmt.restrictions.null')}</span>
                        </div>
                    )}
                </div>
                <div className='flex gap-1.5'>
                    <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                                e.preventDefault()
                                handleAddTag()
                            }
                        }}
                        placeholder={t('engineering.productMgmt.restrictions.placeholder')}
                        className='h-9 text-[11px] font-black uppercase tracking-widest flex-1 bg-muted/40 border-none rounded-xl focus-visible:ring-rose-400 italic'
                    />
                    <Button
                        type='button'
                        size='sm'
                        onClick={handleAddTag}
                        className='shrink-0 h-9 px-3 sm:px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-[11px] font-black uppercase tracking-widest shadow-md shadow-rose-600/10 active:scale-95 transition-all'
                    >
                        <span className='hidden sm:inline'>{t('engineering.productMgmt.restrictions.addButton')}</span>
                        <span className='sm:hidden'>{t('engineering.productMgmt.restrictions.addButtonShort')}</span>
                    </Button>
                </div>
            </div>
        </div>
    )
}
