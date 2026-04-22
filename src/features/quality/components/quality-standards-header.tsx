import { Search, Plus, Filter, Loader2, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/layout/page-header'
import type { QualityStandardsTypeFilter } from '../types/quality-standards-list'

interface QualityStandardsHeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onAdd: () => void
  total: number
  typeFilter: QualityStandardsTypeFilter
  onTypeFilterChange: (value: QualityStandardsTypeFilter) => void
  isFetching?: boolean
}

function getTypeLabel(t: ReturnType<typeof useLanguage>['t'], type: string) {
  if (type === 'IPQC') return t('quality.standards.values.typeProcess')
  if (type === 'FQC') return t('quality.standards.values.typeFinal')
  return t('quality.standards.values.typeQuality')
}

export function QualityStandardsHeader({
  searchQuery,
  onSearchChange,
  onAdd,
  total,
  typeFilter,
  onTypeFilterChange,
  isFetching = false,
}: QualityStandardsHeaderProps) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8'>
      <PageHeader
        icon={ShieldCheck}
        title={t('quality.standards.page.title')}
        description={t('quality.standards.page.description')}
      />

      <div className='flex flex-col justify-between gap-6 px-1 lg:flex-row lg:items-center'>
        <div className='flex flex-col gap-6 sm:flex-row sm:items-center'>
          <div className='flex items-center gap-6'>
            <div className='flex flex-col'>
              <span className='mb-1 text-[10px] leading-none font-semibold text-muted-foreground/60'>
                {t('quality.standards.page.activeProtocols')}
              </span>
              <div className='flex items-baseline gap-1'>
                <span className='text-2xl font-black text-primary tabular-nums'>
                  {total}
                </span>
                <span className='text-[10px] font-semibold text-muted-foreground/50'>
                  {t('quality.standards.page.files')}
                </span>
              </div>
            </div>
            <div className='h-8 w-px border-l border-dashed bg-muted-foreground/10' />
          </div>

          <div className='group relative flex-1'>
            <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground/30 transition-colors group-focus-within:text-primary' />
            <Input
              placeholder={t('quality.standards.page.searchPlaceholder')}
              className='h-12 w-full rounded-2xl border-none bg-muted/50 pr-11 pl-11 text-sm font-medium tracking-normal shadow-inner transition-all focus:bg-background sm:w-[320px] lg:w-[380px]'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {isFetching ? (
              <Loader2 className='absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-primary/70' />
            ) : null}
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2 rounded-2xl border border-dashed border-muted/50 bg-muted/5 px-3'>
            <Filter className='size-4 text-muted-foreground/45' />
            <Select
              value={typeFilter}
              onValueChange={(value: QualityStandardsTypeFilter) =>
                onTypeFilterChange(value)
              }
            >
              <SelectTrigger className='h-11 min-w-[132px] border-none bg-transparent px-0 text-[11px] font-black shadow-none'>
                <SelectValue
                  placeholder={t('quality.standards.page.filterType')}
                />
              </SelectTrigger>
              <SelectContent className='rounded-2xl border-white/10 bg-background'>
                <SelectItem value='ALL' className='text-[11px] font-black'>
                  {t('quality.standards.page.allTypes')}
                </SelectItem>
                <SelectItem value='IQC' className='text-[11px] font-black'>
                  {getTypeLabel(t, 'IQC')} (IQC)
                </SelectItem>
                <SelectItem value='IPQC' className='text-[11px] font-black'>
                  {getTypeLabel(t, 'IPQC')} (IPQC)
                </SelectItem>
                <SelectItem value='FQC' className='text-[11px] font-black'>
                  {getTypeLabel(t, 'FQC')} (FQC)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            size='sm'
            onClick={onAdd}
            className='h-11 flex-1 gap-2 rounded-full bg-primary px-6 text-sm font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 sm:flex-initial'
          >
            <Plus className='size-4' />
            {t('quality.standards.page.add')}
          </Button>
        </div>
      </div>
    </div>
  )
}
