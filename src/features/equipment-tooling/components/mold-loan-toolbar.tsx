'use client'

import { Plus, Search } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface MoldLoanToolbarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onAddClick: () => void
}

export function MoldLoanToolbar({
  searchTerm,
  onSearchChange,
  onAddClick,
}: MoldLoanToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col items-stretch justify-between gap-4 rounded-[24px] border border-dashed bg-muted/5 p-4 sm:p-5 md:flex-row md:items-center'>
      <div className='group relative w-full md:w-[400px]'>
        <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary' />
        <Input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('equipmentTooling.loans.page.searchPlaceholder')}
          className='h-12 w-full rounded-2xl border-none bg-muted/50 pl-11 text-xs font-bold shadow-inner'
        />
      </div>

      <Button
        className='h-12 w-full gap-2 rounded-full bg-blue-600 px-8 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 md:w-auto'
        onClick={onAddClick}
      >
        <Plus className='size-4' />
        {t('equipmentTooling.loans.actions.add')}
      </Button>
    </div>
  )
}
