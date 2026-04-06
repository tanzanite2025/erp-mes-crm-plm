import { Search, Plus, Filter, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'

interface QualityStandardsHeaderProps {
    searchQuery: string
    onSearchChange: (value: string) => void
    onAdd: () => void
    total: number
}

export function QualityStandardsHeader({ 
    searchQuery, 
    onSearchChange, 
    onAdd,
    total 
}: QualityStandardsHeaderProps) {
    const { t } = useLanguage()

    return (
        <div className="flex flex-col gap-8">
            <PageHeader
                icon={ShieldCheck}
                title={t('quality.standards.page.title')}
                description={t('quality.standards.page.description')}
            />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none mb-1">
                                {t('quality.standards.page.activeProtocols')}
                            </span>
                            <div className='flex items-baseline gap-1'>
                                <span className="text-2xl font-black text-primary tracking-tighter italic tabular-nums">{total}</span>
                                <span className='text-[10px] font-black opacity-20'>{t('quality.standards.page.files')}</span>
                            </div>
                        </div>
                        <div className="w-px h-8 bg-muted-foreground/10 border-l border-dashed" />
                    </div>

                    <div className="relative group flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder={t('quality.standards.page.searchPlaceholder')}
                            className="h-12 w-full sm:w-[320px] lg:w-[380px] pl-11 rounded-2xl bg-muted/50 border-none shadow-inner text-[11px] font-bold uppercase tracking-tight focus:bg-background transition-all"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        size='sm'
                        onClick={onAdd}
                        className="h-11 flex-1 sm:flex-initial px-6 rounded-full bg-primary font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all gap-2"
                    >
                        <Plus className="size-4" />
                        {t('quality.standards.page.add')}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 rounded-2xl border border-dashed border-muted/50 bg-muted/5 hover:bg-muted/10 shrink-0"
                        aria-label={t('quality.standards.page.filter')}
                    >
                        <Filter className="size-4 opacity-40" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
