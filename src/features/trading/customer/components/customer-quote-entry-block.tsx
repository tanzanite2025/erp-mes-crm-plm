import { AlertTriangle, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type CustomerQuoteSummaryItem } from '@/features/quotes/services/customer-quote-summary-service'

type CustomerQuoteEntryBlockProps = {
  customerName: string
  quotes: CustomerQuoteSummaryItem[]
  isLoading: boolean
  isError: boolean
  onOpenQuote: (quoteId: string) => void
  onCreateQuote: () => void
}

export function CustomerQuoteEntryBlock({
  customerName,
  quotes,
  isLoading,
  isError,
  onOpenQuote,
  onCreateQuote,
}: CustomerQuoteEntryBlockProps) {
  if (isLoading) {
    return (
      <div className='space-y-1 pt-2 border-t border-dashed border-muted/50'>
        <div className='flex items-center gap-2 text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
          <FileText className='size-3' />
          报价记录
        </div>
        <p className='text-[10px] font-bold text-muted-foreground'>正在加载报价…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className='space-y-1 pt-2 border-t border-dashed border-muted/50'>
        <div className='flex items-center gap-2 text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
          <FileText className='size-3' />
          报价记录
        </div>
        <p className='text-[10px] font-bold text-amber-600'>报价摘要加载失败</p>
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <div className='space-y-2 pt-2 border-t border-dashed border-muted/50'>
        <div className='flex items-center gap-2 text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
          <AlertTriangle className='size-3' />
          报价记录
        </div>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <p className='text-[10px] font-bold text-amber-600'>{customerName} 暂无报价，建议立即报价</p>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onCreateQuote}
            className='h-7 w-full sm:w-auto rounded-full px-3 text-[8px] font-black uppercase tracking-widest'
          >
            新建报价
          </Button>
        </div>
      </div>
    )
  }

  if (quotes.length === 1) {
    const quote = quotes[0]
    return (
      <div className='space-y-2 pt-2 border-t border-dashed border-muted/50'>
        <div className='flex items-center gap-2 text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
          <FileText className='size-3' />
          报价记录
        </div>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline' className='text-[10px] font-black'>
              {quote.quoteNo}
            </Badge>
            <span className='text-[10px] font-bold text-muted-foreground'>{quote.status}</span>
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenQuote(quote.id)}
            className='h-7 w-full sm:w-auto rounded-full px-3 text-[8px] font-black uppercase tracking-widest'
          >
            打开报价
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-2 pt-2 border-t border-dashed border-muted/50'>
      <div className='flex items-center gap-2 text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
        <FileText className='size-3' />
        报价记录
      </div>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='outline' className='text-[10px] font-black'>
            {quotes.length} 张报价
          </Badge>
          <span className='text-[10px] font-bold text-muted-foreground'>选择单号后直接打开</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-7 w-full sm:w-auto rounded-full px-3 text-[8px] font-black uppercase tracking-widest'
            >
              选择报价
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='rounded-[16px] p-2'>
            {quotes.map((quote) => (
              <DropdownMenuItem
                key={quote.id}
                onClick={() => onOpenQuote(quote.id)}
                className='rounded-lg px-3 py-2 text-[10px] font-black'
              >
                {quote.quoteNo} · {quote.status}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
