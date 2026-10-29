import { useId } from 'react'
import { CircleHelp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/** Explains quantity ownership without calculating or modifying inventory. */
export function ProductionMaterialIssuanceQuantityMeaningHelpPopover({
  compact = false,
}: { compact?: boolean } = {}) {
  const { t } = useLanguage()
  const headingId = useId()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className={cn(
            'shrink-0 gap-2 rounded-full border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200',
            compact && 'size-8 p-0 @xl:w-auto @xl:px-3'
          )}
          aria-label={t('mrp.productionMaterialIssuance.quantityHelp.trigger')}
        >
          <CircleHelp aria-hidden='true' className='size-4' />
          <span className={compact ? 'hidden @xl:inline' : undefined}>
            {t('mrp.productionMaterialIssuance.quantityHelp.title')}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='end'
        sideOffset={8}
        collisionPadding={16}
        aria-labelledby={headingId}
        className='max-h-[min(32rem,var(--radix-popover-content-available-height))] w-96 max-w-[calc(100vw-2rem)] space-y-3 overflow-y-auto rounded-xl border-sky-300 bg-sky-100 text-sky-950 shadow-xl shadow-sky-950/20 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-50'
      >
        <h2 id={headingId} className='text-sm font-semibold'>
          {t('mrp.productionMaterialIssuance.quantityHelp.title')}
        </h2>
        <dl className='space-y-3 text-sm leading-6'>
          {(
            [
              'required',
              'issued',
              'returned',
              'netIssued',
              'remaining',
              'aboveStandard',
              'supplement',
            ] as const
          ).map((quantity) => (
            <div key={quantity} className='space-y-1'>
              <dt className='font-semibold'>
                {t(
                  `mrp.productionMaterialIssuance.quantityHelp.${quantity}.title`
                )}
              </dt>
              <dd>
                {t(
                  `mrp.productionMaterialIssuance.quantityHelp.${quantity}.description`
                )}
              </dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  )
}
