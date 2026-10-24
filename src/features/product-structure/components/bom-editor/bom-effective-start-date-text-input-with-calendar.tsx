import { useState } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { enUS, zhCN } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { formatEngineeringDateProtocol } from '@/lib/codecs/code-normalization'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  useFormField,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { type BOM } from '../../data/schema'
import {
  getBOMEffectiveDateCalendarSelection,
  parseBOMEffectiveDateInputToDateProtocol,
} from '../../utils/bom-effective-date-input-and-calendar-date-protocol'

/** Owns date entry only. Form validation and the service own the date protocol and HTTP mapping. */
export function BOMEffectiveStartDateTextInputWithCalendar({
  form,
  isLocked,
}: {
  form: UseFormReturn<BOM>
  isLocked: boolean
}) {
  const { t, locale } = useLanguage()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState<Date>()
  const invalidDateMessage = t(
    'engineering.bomArchive.form.effectiveDateInvalid'
  )

  return (
    <FormField
      control={form.control}
      name='effectiveFrom'
      render={({ field, fieldState }) => {
        const selectedDate = getBOMEffectiveDateCalendarSelection(field.value)
        return (
          <FormItem className='min-w-0 gap-1.5'>
            <FormLabel className='text-[11px] font-bold text-foreground/80'>
              {t('engineering.bomArchive.form.effectiveFrom')}
            </FormLabel>
            <div className='flex min-w-0 items-center gap-1'>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  type='text'
                  inputMode='text'
                  autoComplete='off'
                  disabled={isLocked}
                  placeholder='YYYY-MM-DD'
                  className='h-9! min-w-0 flex-1 rounded-xl border-transparent bg-muted/50 text-xs shadow-none'
                  onChange={(event) => {
                    if (isLocked) return
                    field.onChange(event.target.value)
                  }}
                  onBlur={() => {
                    field.onBlur()
                    if (isLocked) return
                    const normalized = parseBOMEffectiveDateInputToDateProtocol(
                      field.value ?? ''
                    )
                    if (normalized === null) {
                      form.setError('effectiveFrom', {
                        type: 'validate',
                        message: invalidDateMessage,
                      })
                    } else {
                      field.onChange(normalized)
                      form.clearErrors('effectiveFrom')
                    }
                  }}
                />
              </FormControl>
              <Popover
                open={calendarOpen}
                onOpenChange={(open) => {
                  if (isLocked) return
                  if (open) setCalendarMonth(selectedDate ?? new Date())
                  setCalendarOpen(open)
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type='button'
                    variant='secondary'
                    size='icon'
                    className='size-9 shrink-0 rounded-xl border border-border/60'
                    disabled={isLocked}
                    aria-label={t(
                      'engineering.bomArchive.form.effectiveDateOpenCalendar'
                    )}
                  >
                    <CalendarIcon className='size-4' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align='end'
                  collisionPadding={8}
                  className='w-auto p-0'
                  onEscapeKeyDown={(event) => event.stopPropagation()}
                >
                  <Calendar
                    mode='single'
                    required
                    captionLayout='dropdown'
                    locale={locale.startsWith('zh') ? zhCN : enUS}
                    startMonth={
                      selectedDate && selectedDate.getFullYear() < 1900
                        ? selectedDate
                        : new Date(1900, 0)
                    }
                    endMonth={
                      new Date(
                        Math.max(
                          new Date().getFullYear() + 20,
                          selectedDate?.getFullYear() ?? 0
                        ),
                        11
                      )
                    }
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (isLocked) return
                      field.onChange(formatEngineeringDateProtocol(date))
                      form.clearErrors('effectiveFrom')
                      field.onBlur()
                      setCalendarOpen(false)
                    }}
                    autoFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <FormDescription className='text-[10px] leading-relaxed'>
              {t('engineering.bomArchive.form.effectiveDateInputHint')}
            </FormDescription>
            {fieldState.error && (
              <BOMEffectiveDateValidationMessage message={invalidDateMessage} />
            )}
          </FormItem>
        )
      }}
    />
  )
}

function BOMEffectiveDateValidationMessage({ message }: { message: string }) {
  const { formMessageId } = useFormField()
  return (
    <p id={formMessageId} role='alert' className='text-xs text-destructive'>
      {message}
    </p>
  )
}
