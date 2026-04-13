import { Filter, Plus, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { QuoteCustomerFilter, QuoteStatusFilter, QuoteTypeFilter } from '@/features/quotes/data/quote-summary'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type QuoteWorkspaceFiltersProps = {
  customer: QuoteCustomerFilter
  keyword: string
  quoteType: QuoteTypeFilter
  status: QuoteStatusFilter
  onCreateQuote: () => void
  onCustomerChange: (value: QuoteCustomerFilter) => void
  onKeywordChange: (value: string) => void
  onQuoteTypeChange: (value: QuoteTypeFilter) => void
  onStatusChange: (value: QuoteStatusFilter) => void
}

export function QuoteWorkspaceFilters({
  customer,
  keyword,
  quoteType,
  status,
  onCreateQuote,
  onCustomerChange,
  onKeywordChange,
  onQuoteTypeChange,
  onStatusChange,
}: QuoteWorkspaceFiltersProps) {
  const handleReset = () => {
    onCustomerChange('all')
    onKeywordChange('')
    onQuoteTypeChange('all')
    onStatusChange('all')
  }

  return (
    <div className='flex flex-col gap-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4 shadow-inner'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex items-center gap-2 text-sm font-black italic tracking-tight text-foreground'>
          <Filter className='size-4 text-primary' />
          报价筛选
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button className='h-10 rounded-2xl px-4 text-xs font-black' size='sm' onClick={onCreateQuote}>
            <Plus className='size-4' />
            新建报价
          </Button>
          <Button className='h-10 rounded-2xl px-4 text-xs font-black' size='sm' variant='outline' onClick={handleReset}>
            <RotateCcw className='size-4' />
            重置筛选
          </Button>
        </div>
      </div>
      <div className='grid gap-2.5 md:grid-cols-2 xl:grid-cols-[170px_170px_170px_minmax(240px,1fr)]'>
        <label className='space-y-2'>
          <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>客户</span>
          <Select value={customer} onValueChange={onCustomerChange}>
            <SelectTrigger className='h-9 w-full rounded-xl border-dashed bg-background/80 px-3 text-[13px] font-semibold'>
              <SelectValue placeholder='全部客户' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部客户</SelectItem>
              <SelectItem value='vip'>重点客户</SelectItem>
              <SelectItem value='long-term'>长期客户</SelectItem>
              <SelectItem value='new'>新客户</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className='space-y-2'>
          <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>状态</span>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className='h-9 w-full rounded-xl border-dashed bg-background/80 px-3 text-[13px] font-semibold'>
              <SelectValue placeholder='全部状态' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部状态</SelectItem>
              <SelectItem value='draft'>草稿</SelectItem>
              <SelectItem value='pending'>待确认</SelectItem>
              <SelectItem value='converted'>已转正式单</SelectItem>
              <SelectItem value='voided'>已作废</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className='space-y-2'>
          <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>类型</span>
          <Select value={quoteType} onValueChange={onQuoteTypeChange}>
            <SelectTrigger className='h-9 w-full rounded-xl border-dashed bg-background/80 px-3 text-[13px] font-semibold'>
              <SelectValue placeholder='全部类型' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部类型</SelectItem>
              <SelectItem value='retail'>零售</SelectItem>
              <SelectItem value='wholesale'>批发</SelectItem>
              <SelectItem value='sample'>打样</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className='space-y-2'>
          <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>关键词</span>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60' />
            <Input
              className='h-9 rounded-xl border-dashed bg-background/80 pl-9 text-[13px] font-semibold'
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder='搜索报价编号、客户、产品型号'
            />
          </div>
        </label>
      </div>
    </div>
  )
}
