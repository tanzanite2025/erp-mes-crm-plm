import { Search, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'

interface StockMgmtToolbarProps {
    searchTerm: string
    onSearchChange: (value: string) => void
    onReconcile: () => void
}

export function StockMgmtToolbar({ 
    searchTerm, 
    onSearchChange, 
    onReconcile 
}: StockMgmtToolbarProps) {
    const { t } = useLanguage()

    return (
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4'>
            <div className='relative max-w-sm flex-1'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
                <Input
                    placeholder={t('warehouse.stock.searchPlaceholder')}
                    className='pl-10 h-11 md:h-12 rounded-xl md:rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 text-xs md:text-sm font-medium transition-all'
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            <div className='flex items-center gap-3'>
                <Button
                    onClick={onReconcile}
                    className='h-10 md:h-11 flex-1 sm:flex-none px-4 md:px-6 rounded-full font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all gap-2'
                >
                    <ShieldCheck className='size-4' />
                    {t('warehouse.stock.reconcile')}
                </Button>
            </div>
        </div>
    )
}
