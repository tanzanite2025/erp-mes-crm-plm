import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'

interface WeavingModeToolbarProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onCreate: () => void
}

export function WeavingModeToolbar({
  searchTerm,
  onSearchTermChange,
  onCreate,
}: WeavingModeToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-4 rounded-[28px] border border-dashed border-muted/40 bg-background/80 p-5 shadow-sm md:flex-row md:items-center md:justify-between'>
      <Input
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        placeholder={t('engineering.masterData.weavingMode.placeholders.search')}
        className='h-11 rounded-2xl border-none bg-muted/20 px-5 text-sm font-medium shadow-inner md:max-w-sm'
      />
      <Button onClick={onCreate} className='h-11 rounded-full px-8 text-[10px] font-black uppercase tracking-widest'>
        <Plus className='mr-2 size-4' />
        {t('engineering.masterData.weavingMode.actions.create')}
      </Button>
    </div>
  )
}
