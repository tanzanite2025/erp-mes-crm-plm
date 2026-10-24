import { useId } from 'react'
import { type TranslationKey } from '@/locales'
import { CircleHelp } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  bomFieldBusinessMeaningHelpTopicItemKeys,
  type BOMFieldBusinessMeaningHelpTopic,
} from '../data/bom-field-business-meaning-help-topic-definitions'

/** Read-only business content shared by field help and the BOM handbook. */
export function BOMFieldBusinessMeaningExplanation({
  topic,
}: {
  topic: BOMFieldBusinessMeaningHelpTopic
}) {
  const { t } = useLanguage()
  return (
    <div className='space-y-3 text-sm leading-6'>
      <p className='text-muted-foreground'>
        {t(`engineering.bomFieldHelp.${topic}.summary`)}
      </p>
      <dl className='space-y-3'>
        {bomFieldBusinessMeaningHelpTopicItemKeys[topic].map((itemKey) => (
          <div key={itemKey} className='space-y-1'>
            <dt className='font-medium'>
              {t(
                `engineering.bomFieldHelp.${topic}.items.${itemKey}.title` as TranslationKey
              )}
            </dt>
            <dd className='text-muted-foreground'>
              {t(
                `engineering.bomFieldHelp.${topic}.items.${itemKey}.description` as TranslationKey
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className='border-t pt-3 text-xs leading-6 text-muted-foreground'>
        {t(`engineering.bomFieldHelp.${topic}.instruction`)}
      </p>
    </div>
  )
}

/** Place beside the label, outside the label element; never submits or edits a form. */
export function BOMFieldBusinessMeaningHelpPopover({
  topic,
  fieldLabel,
}: {
  topic: BOMFieldBusinessMeaningHelpTopic
  fieldLabel: string
}) {
  const { t } = useLanguage()
  const headingId = useId()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='-my-0.5 size-6 shrink-0 rounded-full text-muted-foreground hover:bg-sky-100 hover:text-sky-800 dark:hover:bg-sky-950 dark:hover:text-sky-200'
          aria-label={t('engineering.bomFieldHelp.triggerLabel', {
            field: fieldLabel,
          })}
        >
          <CircleHelp aria-hidden='true' className='size-3.5' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        sideOffset={6}
        aria-labelledby={headingId}
        className='max-h-[min(32rem,var(--radix-popover-content-available-height))] w-96 max-w-[calc(100vw-2rem)] space-y-3 overflow-y-auto rounded-xl border-sky-300 bg-sky-100 text-sky-950 shadow-xl shadow-sky-950/20 [--border:var(--color-sky-300)] [--muted-foreground:var(--color-sky-900)] dark:border-sky-700 dark:bg-sky-950 dark:text-sky-50 dark:shadow-black/40 dark:[--border:var(--color-sky-700)] dark:[--muted-foreground:var(--color-sky-100)]'
      >
        <h2 id={headingId} className='text-sm font-semibold'>
          {t(`engineering.bomFieldHelp.${topic}.title`)}
        </h2>
        <BOMFieldBusinessMeaningExplanation topic={topic} />
      </PopoverContent>
    </Popover>
  )
}
