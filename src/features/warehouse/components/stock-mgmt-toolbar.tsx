import { Search, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface StockMgmtToolbarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onReconcile: () => void
}

export function StockMgmtToolbar({
  searchTerm,
  onSearchChange,
  onReconcile,
}: StockMgmtToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center'>
      <div className='relative max-w-sm flex-1'>
        <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
        <Input
          placeholder={t('warehouse.stock.searchPlaceholder')}
          className='h-11 rounded-xl border-none bg-muted/50 pl-10 text-xs font-medium transition-all focus-visible:ring-1 focus-visible:ring-primary/20 md:h-12 md:rounded-2xl md:text-sm'
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className='flex items-center gap-3'>
        <Button
          onClick={onReconcile}
          className='h-10 flex-1 gap-2 rounded-full px-4 text-[9px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95 sm:flex-none md:h-11 md:px-6 md:text-[10px]'
        >
          <ShieldCheck className='size-4' />
          {t('warehouse.stock.reconcile')}
        </Button>
      </div>
    </div>
  )
}
