import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type BusinessEventSource } from '../../workflow-core/data/business-event-source-schema'

interface NotificationRuleListToolbarProps {
  keyword: string
  onKeywordChange: (value: string) => void
  sourceCodeFilter: string
  onSourceCodeFilterChange: (value: string) => void
  sources: BusinessEventSource[]
}

export function NotificationRuleListToolbar({
  keyword,
  onKeywordChange,
  sourceCodeFilter,
  onSourceCodeFilterChange,
  sources,
}: NotificationRuleListToolbarProps) {
  return (
    <div className='grid gap-3 rounded-[24px] border border-dashed border-muted/40 bg-background px-5 py-4 md:grid-cols-[minmax(0,1fr)_220px]'>
      <div className='relative'>
        <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50' />
        <Input
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder='按规则名搜索'
          className='h-10 rounded-2xl pl-9 text-sm font-bold'
        />
      </div>
      <Select value={sourceCodeFilter} onValueChange={onSourceCodeFilterChange}>
        <SelectTrigger className='h-10 rounded-2xl text-xs font-black'>
          <SelectValue placeholder='按业务源筛选' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>全部业务源</SelectItem>
          {sources.map((source) => (
            <SelectItem key={source.id} value={source.code}>
              {source.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
