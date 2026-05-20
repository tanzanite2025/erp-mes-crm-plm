import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'

interface WeavingModeToolbarProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onCreate: () => void
  metrics: {
    total: number
    active: number
    presets: number
  }
}

export function WeavingModeToolbar({
  searchTerm,
  onSearchTermChange,
  onCreate,
  metrics,
}: WeavingModeToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-3 rounded-[24px] border border-dashed border-muted/30 bg-background/80 p-3 px-4 shadow-none md:flex-row md:items-center md:justify-between'>
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:flex-1 md:max-w-2xl'>
        <Input
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder={t('engineering.masterData.weavingMode.placeholders.search')}
          className='h-10 rounded-xl border-none bg-muted/20 px-4 text-sm font-medium shadow-inner md:max-w-xs'
        />
        <div className='inline-flex items-center gap-2.5 rounded-full border border-dashed border-primary/20 bg-primary/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-primary/70 self-start md:self-auto'>
          <span>{t('engineering.masterData.weavingMode.metrics.total', { count: metrics.total })}</span>
          <span className='opacity-40'>/</span>
          <span>{t('engineering.masterData.weavingMode.metrics.active', { count: metrics.active })}</span>
          <span className='opacity-40'>/</span>
          <span>{t('engineering.masterData.weavingMode.metrics.presets', { count: metrics.presets })}</span>
        </div>
      </div>
      <Button onClick={onCreate} className='h-10 rounded-full px-6 text-[10px] font-black uppercase tracking-widest'>
        <Plus className='mr-2 size-3.5' />
        {t('engineering.masterData.weavingMode.actions.create')}
      </Button>
    </div>
  )
}
