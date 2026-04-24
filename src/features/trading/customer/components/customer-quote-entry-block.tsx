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
  compact?: boolean
}

export function CustomerQuoteEntryBlock({
  customerName,
  quotes,
  isLoading,
  isError,
  onOpenQuote,
  onCreateQuote,
  compact = false,
}: CustomerQuoteEntryBlockProps) {
  const { t } = useLanguage()
  const sectionClass = compact
    ? 'space-y-2'
    : 'space-y-2 border-t border-dashed border-muted/50 pt-2'

  if (isLoading) {
    return (
      <div
        className={
          compact
            ? 'space-y-1'
            : 'space-y-1 border-t border-dashed border-muted/50 pt-2'
        }
      >
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
      <div
        className={
          compact
            ? 'space-y-1'
            : 'space-y-1 border-t border-dashed border-muted/50 pt-2'
        }
      >
        <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
          <FileText className='size-3' />
          {t('trading.customers.summary.quoteTitle')}
        </div>
        <p className='text-[10px] font-bold text-amber-600'>
          {t('trading.customers.summary.quoteLoadFailed')}
        </p>
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <div className={sectionClass}>
        <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
          <AlertTriangle className='size-3' />
          {t('trading.customers.summary.quoteTitle')}
        </div>
        <div className='rounded-xl border border-dashed border-muted/40 bg-muted/10 px-3 py-2.5'>
          <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_136px] sm:items-center'>
            <div className='space-y-1'>
              <p className='text-[10px] font-black text-amber-700'>
                {t('trading.customers.summary.quoteEmptyTitle', { customerName })}
              </p>
              <p className='text-[9px] font-bold text-amber-600/80'>
                {t('trading.customers.summary.quoteEmptyDescription')}
              </p>
            </div>
            <div className='sm:w-[136px] sm:justify-self-end'>
              <Button
                type='button'
                variant='default'
                size='sm'
                onClick={onCreateQuote}
                className='h-9 w-full animate-in rounded-full border border-primary/30 bg-primary px-4 text-[9px] font-black tracking-widest text-primary-foreground uppercase shadow-lg shadow-primary/25 duration-300 fade-in hover:bg-primary/90'
              >
                {t('trading.customers.summary.quoteCreate')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (quotes.length === 1) {
    const quote = quotes[0]
    return (
      <div className={sectionClass}>
        <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
          <FileText className='size-3' />
          {t('trading.customers.summary.quoteTitle')}
        </div>
        <div className='rounded-xl border border-dashed border-muted/40 bg-muted/10 px-3 py-2.5'>
          <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_136px] sm:items-center'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='outline' className='text-[10px] font-black'>
                {quote.quoteNo}
              </Badge>
              <span className='text-[10px] font-bold text-muted-foreground'>
                {quote.status}
              </span>
            </div>
            <div className='sm:w-[136px] sm:justify-self-end'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => onOpenQuote(quote.id)}
                className='h-9 w-full rounded-full px-4 text-[9px] font-black tracking-widest uppercase'
              >
                {t('trading.customers.summary.quoteOpen')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={sectionClass}>
      <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
        <FileText className='size-3' />
        {t('trading.customers.summary.quoteTitle')}
      </div>
      <div className='rounded-xl border border-dashed border-muted/40 bg-muted/10 px-3 py-2.5'>
        <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_136px] sm:items-center'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant='outline' className='text-[10px] font-black'>
              {t('trading.customers.summary.quoteCount', { count: quotes.length })}
            </Badge>
            <span className='text-[10px] font-bold text-muted-foreground'>
              {t('trading.customers.summary.quoteSelectHint')}
            </span>
          </div>
          <div className='sm:w-[136px] sm:justify-self-end'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='h-9 w-full rounded-full px-4 text-[9px] font-black tracking-widest uppercase'
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
                    {quote.quoteNo} / {quote.status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
