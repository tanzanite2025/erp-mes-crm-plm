import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ApsSchedulingSource } from '../adapters/aps-scheduling.adapter'
import { useLanguage } from '@/context/language-provider'

type ApsToolbarProps = {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  source: ApsSchedulingSource
}

export function ApsToolbar({ searchTerm, onSearchTermChange, source }: ApsToolbarProps) {
  const { t } = useLanguage()
  const draftCount = source.jobs.filter((job) => job.status === 'draft').length
  const lateCount = source.jobs.filter((job) => job.status === 'late').length

  return (
    <div className='flex flex-col gap-4 overflow-hidden rounded-[32px] border border-dashed border-muted-foreground/10 bg-muted/5 p-8 shadow-inner lg:flex-row lg:items-center lg:justify-between'>
      <div className='group relative w-full max-w-xl'>
        <Search className='absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/30 transition-colors group-focus-within:text-cyan-500' />
        <Input
          placeholder={t('apsScheduling.board.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className='h-12 rounded-2xl border-none bg-background pl-11 text-sm font-medium shadow-inner focus-visible:ring-cyan-500/20'
        />
      </div>
      <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end'>
        <div className='rounded-full border border-dashed border-cyan-500/15 bg-cyan-500/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-700/70'>
          {t('apsScheduling.board.pending')} {draftCount}
        </div>
        <div className='rounded-full border border-dashed border-amber-500/15 bg-amber-500/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-700/70'>
          {t('apsScheduling.board.capacity')} {Math.max(0, Math.min(100, source.lanes.length * 18 + 24))}%
        </div>
        <div className='rounded-full border border-dashed border-rose-500/15 bg-rose-500/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-700/70'>
          {t('apsScheduling.board.risk')} {lateCount}
        </div>
      </div>
      <div className='flex items-center gap-3'>
        <Button variant='outline' className='h-11 rounded-full px-5 text-[10px] font-black uppercase tracking-widest gap-2'>
          <SlidersHorizontal className='size-4' /> {t('apsScheduling.board.rules')}
        </Button>
        <Button className='h-11 rounded-full bg-cyan-600 px-8 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-cyan-700 active:scale-95 gap-2 shadow-xl shadow-cyan-600/20'>
          <Plus className='size-4' /> {t('apsScheduling.board.create')}
        </Button>
      </div>
    </div>
  )
}
