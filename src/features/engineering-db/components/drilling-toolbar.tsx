import { Search, Plus } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'

interface DrillingToolbarProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onCreate: () => void
}

export function DrillingToolbar({
  searchTerm,
  onSearchTermChange,
  onCreate,
}: DrillingToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col items-center justify-between gap-3 overflow-hidden rounded-[24px] border border-dashed border-muted-foreground/10 bg-muted/5 p-3 px-4 shadow-inner sm:flex-row'>
      <div className='group relative w-full sm:w-80'>
        <Search className='absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-indigo-600' />
        <Input
          placeholder={t('engineering.drilling.placeholders.search')}
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          className='h-10 w-full rounded-xl border-none bg-background pl-9 text-sm font-medium shadow-inner focus-visible:ring-1 focus-visible:ring-indigo-600/20'
        />
      </div>
      <div className='flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center'>
        <AuditTimelineTriggerButton
          module={AUDIT_MODULES.drilling}
          targetName={t('engineering.drilling.overview.title')}
          label={t('common.audit.trigger')}
          className='h-10 rounded-full px-4 text-[10px] font-black uppercase'
        />
        <Button
          onClick={onCreate}
          className='h-10 w-full gap-1.5 rounded-full bg-indigo-600 px-6 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-95 sm:w-auto'
        >
          <Plus className='size-3.5' /> {t('engineering.drilling.table.upload')}
        </Button>
      </div>
    </div>
  )
}
