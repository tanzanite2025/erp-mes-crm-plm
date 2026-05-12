'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { type BOM } from '../data/schema'

interface BOMDialogFooterProps {
  form: UseFormReturn<BOM>
  isSubmitDisabled: boolean
}

export function BOMDialogFooter({ form, isSubmitDisabled }: BOMDialogFooterProps) {
  const { t } = useLanguage()

  return (
    <div className='flex h-auto shrink-0 flex-col items-stretch gap-1.5 border-t border-dashed border-muted/50 pt-1 sm:h-11 sm:flex-row sm:gap-2'>
      <FormField
        control={form.control}
        name='description'
        render={({ field }) => (
          <FormItem className='flex-1 space-y-0'>
            <FormControl>
              <Input
                placeholder={t('engineering.bomArchive.dialog.remarkPlaceholder')}
                {...field}
                className='h-11 rounded-2xl border-none bg-muted/50 px-4 text-[11px] font-bold uppercase tracking-widest italic shadow-inner placeholder:text-[9px] placeholder:italic placeholder:text-muted-foreground/40 sm:h-full'
              />
            </FormControl>
          </FormItem>
        )}
      />
      <Button
        type='submit'
        form='bom-form'
        disabled={isSubmitDisabled}
        className='h-12 w-full shrink-0 rounded-xl border border-white/20 bg-blue-600 text-[10px] font-black uppercase tracking-widest italic text-white shadow-lg shadow-blue-600/10 transition-all hover:bg-blue-700 sm:h-full sm:w-64'
      >
        {t('engineering.bomArchive.dialog.save')}
      </Button>
    </div>
  )
}
