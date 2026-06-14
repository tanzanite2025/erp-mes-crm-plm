import { RefreshCw, Search } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  search: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  totalCount: number
}

export function VehicleSpecsLibraryToolbar({
  search,
  onSearchChange,
  onRefresh,
  totalCount,
}: Props) {
  const { t } = useLanguage()

  return (
    <div className='rounded-[24px] border border-dashed border-border/60 bg-background/80 p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur-sm'>
      <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
        <div className='flex flex-1 flex-col gap-3 sm:flex-row sm:items-center'>
          <div className='relative w-full max-w-xl'>
            <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('common.actions.search')}
              className='h-10 rounded-xl border-border/70 bg-background pl-9 text-[13px]'
            />
          </div>
          <div className='uds-chip text-[10px] whitespace-nowrap'>{`${t('common.labels.nodes')} ${totalCount}`}</div>
        </div>

        <div className='flex items-center gap-2 self-start xl:self-auto'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onRefresh}
            className='h-10 gap-2 rounded-xl px-4 text-[10px] font-black tracking-[0.2em] uppercase'
          >
            <RefreshCw className='size-4' />
            {t('common.actions.refresh')}
          </Button>
        </div>
      </div>
    </div>
  )
}
