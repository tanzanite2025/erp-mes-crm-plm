import { Search, Plus } from 'lucide-react'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
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
    <div className='flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/5 p-3 px-4 rounded-[24px] border border-dashed border-muted-foreground/10 shadow-inner overflow-hidden'>
      <div className='relative w-full sm:w-80 group'>
        <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40 group-focus-within:text-indigo-600 transition-colors' />
        <Input
          placeholder={t('engineering.drilling.placeholders.search')}
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          className='pl-9 h-10 rounded-xl border-none bg-background shadow-inner text-sm font-medium focus-visible:ring-1 focus-visible:ring-indigo-600/20 w-full'
        />
      </div>
      <div className='flex w-full sm:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-2.5'>
        <AuditTimelineTriggerButton
          module={AUDIT_MODULES.drilling}
          targetName={t('engineering.drilling.overview.title')}
          label={t('common.audit.trigger')}
          className='h-10 rounded-full px-4 text-[10px] font-black uppercase'
        />
        <Button
          onClick={onCreate}
          className='w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 rounded-full h-10 px-6 font-black text-[10px] uppercase tracking-widest text-white gap-1.5 transition-all active:scale-95'
        >
          <Plus className='size-3.5' /> {t('engineering.drilling.table.upload')}
        </Button>
      </div>
    </div>
  )
}
