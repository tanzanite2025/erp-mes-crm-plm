'use client'

import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'

interface MoldLoanToolbarProps {
    searchTerm: string
    onSearchChange: (value: string) => void
    onAddClick: () => void
}

export function MoldLoanToolbar({ searchTerm, onSearchChange, onAddClick }: MoldLoanToolbarProps) {
    const { t } = useLanguage()

    return (
        <div className='flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-muted/5 p-4 sm:p-5 rounded-[24px] border border-dashed'>
            <div className='relative w-full md:w-[400px] group'>
                <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-colors group-focus-within:text-primary' />
                <Input
                    value={searchTerm}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder={t('equipmentTooling.loans.page.searchPlaceholder')}
                    className='pl-11 h-12 w-full rounded-2xl border-none bg-muted/50 font-bold text-xs shadow-inner'
                />
            </div>

            <Button
                className='rounded-full h-12 px-8 bg-blue-600 hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all w-full md:w-auto'
                onClick={onAddClick}
            >
                <Plus className='size-4' />
                {t('equipmentTooling.loans.actions.add')}
            </Button>
        </div>
    )
}
