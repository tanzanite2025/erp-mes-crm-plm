import { AlertTriangle, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/context/language-provider'
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
  const { t } = useLanguage()

  if (isLoading) {
    return (
      <div className='space-y-1 border-t border-dashed border-muted/50 pt-2'>
        <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
          <FileText className='size-3' />
          {t('trading.customers.summary.quoteTitle')}
        </div>
        <p className='text-[10px] font-bold text-muted-foreground'>
          {t('trading.customers.summary.quoteLoading')}
        </p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className='space-y-1 border-t border-dashed border-muted/50 pt-2'>
        <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
          <FileText className='size-3' />
          {t('trading.customers.summary.quoteTitle')}
        </div>
        <p className='text-[10px] font-bold text-amber-600'>{t('trading.customers.summary.quoteLoadFailed')}</p>
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <div className='space-y-2 border-t border-dashed border-muted/50 pt-2'>
        <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
          <AlertTriangle className='size-3' />
          {t('trading.customers.summary.quoteTitle')}
        </div>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div className='space-y-1'>
            <p className='text-[10px] font-black text-amber-700'>
              {t('trading.customers.summary.quoteEmptyTitle', { customerName })}
            </p>
            <p className='text-[9px] font-bold text-amber-600/80'>
              {t('trading.customers.summary.quoteEmptyDescription')}
            </p>
          </div>
          <Button
            type='button'
            variant='default'
            size='sm'
            onClick={onCreateQuote}
            className='h-9 w-full animate-in rounded-full border border-primary/30 bg-primary px-4 text-[9px] font-black tracking-widest text-primary-foreground uppercase shadow-lg shadow-primary/25 duration-300 fade-in hover:bg-primary/90 sm:w-auto'
          >
            {t('trading.customers.summary.quoteCreate')}
          </Button>
        </div>
      </div>
    )
  }

  if (quotes.length === 1) {
    const quote = quotes[0]
    return (
      <div className='space-y-2 border-t border-dashed border-muted/50 pt-2'>
        <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
          <FileText className='size-3' />
          {t('trading.customers.summary.quoteTitle')}
        </div>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline' className='text-[10px] font-black'>
              {quote.quoteNo}
            </Badge>
            <span className='text-[10px] font-bold text-muted-foreground'>
              {quote.status}
            </span>
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenQuote(quote.id)}
            className='h-7 w-full rounded-full px-3 text-[8px] font-black tracking-widest uppercase sm:w-auto'
          >
            {t('trading.customers.summary.quoteOpen')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-2 border-t border-dashed border-muted/50 pt-2'>
      <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
        <FileText className='size-3' />
        {t('trading.customers.summary.quoteTitle')}
      </div>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='outline' className='text-[10px] font-black'>
            {t('trading.customers.summary.quoteCount', { count: quotes.length })}
          </Badge>
          <span className='text-[10px] font-bold text-muted-foreground'>
            {t('trading.customers.summary.quoteSelectHint')}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-7 w-full rounded-full px-3 text-[8px] font-black tracking-widest uppercase sm:w-auto'
            >
              {t('trading.customers.summary.quoteSelect')}
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
