import { Route, User, X } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type SalesReturnsContextBannerProps = {
  customerId?: string
  customerName?: string
  onClearCustomerContext: () => void
}

export function SalesReturnsContextBanner({
  customerId,
  customerName,
  onClearCustomerContext,
}: SalesReturnsContextBannerProps) {
  const { t } = useLanguage()
  const hasCustomerContext = Boolean(customerId || customerName)
  const resolvedCustomerLabel = customerName || customerId || '-'

  if (!hasCustomerContext) {
    return null
  }

  return (
    <Card className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 shadow-none'>
      <CardContent className='flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6'>
        <div className='space-y-2'>
          <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-primary/70 uppercase'>
            <Route className='size-3.5' />
            {t('trading.salesReturns.context.fromCustomer')}
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-sm font-black text-foreground'>
              {t('trading.salesReturns.context.customerLabel')}
            </span>
            <span className='inline-flex items-center rounded-full border border-primary/20 bg-background/80 px-3 py-1 text-[10px] font-black tracking-wider text-foreground'>
              <User className='mr-1.5 size-3' />
              {resolvedCustomerLabel}
            </span>
          </div>

          <p className='text-xs leading-6 font-bold text-muted-foreground'>
            {t('trading.salesReturns.context.descriptionWithCustomer')}
          </p>
        </div>

        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onClearCustomerContext}
          className='h-9 rounded-full px-4 text-[10px] font-black tracking-widest uppercase'
        >
          <X className='mr-1.5 size-3.5' />
          {t('trading.salesReturns.context.clear')}
        </Button>
      </CardContent>
    </Card>
  )
}
