'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Lock } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { type BOM } from '../data/schema'
import { isMBOM } from '../utils/bom-identity'

interface BOMDialogFooterProps {
  form: UseFormReturn<BOM>
  currentRow?: BOM
  onPromote: (status: string) => Promise<void>
  isSubmitDisabled: boolean
}

export function BOMDialogFooter({
  form,
  currentRow,
  onPromote,
  isSubmitDisabled,
}: BOMDialogFooterProps) {
  const { t } = useLanguage()
  const status = currentRow?.status || 'DRAFT'
  const isLocked = currentRow?.isLocked || false

  return (
    <div className='flex h-auto shrink-0 flex-col items-stretch gap-1.5 border-t border-dashed border-muted/50 pt-1 sm:h-11 sm:flex-row sm:gap-2'>
      <FormField
        control={form.control}
        name='description'
        render={({ field }) => (
          <FormItem className='flex-1 space-y-0'>
            <FormControl>
              <Input
                placeholder={t(
                  'engineering.bomArchive.dialog.remarkPlaceholder'
                )}
                disabled={isLocked}
                {...field}
                className='h-11 rounded-2xl border-none bg-muted/50 px-4 text-[11px] font-bold tracking-widest uppercase italic shadow-inner placeholder:text-[9px] placeholder:text-muted-foreground/40 placeholder:italic sm:h-full'
              />
            </FormControl>
          </FormItem>
        )}
      />

      <div className='flex items-center gap-2'>
        {isLocked ? (
          <div className='flex items-center gap-2 px-6 text-muted-foreground/40'>
            <Lock className='size-3' />
            <span className='text-[10px] font-black tracking-widest uppercase italic'>
              {t('engineering.bomArchive.dialog.locked')}
            </span>
          </div>
        ) : (
          <>
            <Button
              type='submit'
              form='bom-form'
              variant='outline'
              disabled={isSubmitDisabled}
              className='h-12 flex-1 shrink-0 rounded-xl border-dashed border-muted-foreground/20 text-[10px] font-black tracking-widest uppercase italic transition-all hover:bg-muted/50 sm:h-full sm:w-32'
            >
              {t('engineering.bomArchive.dialog.saveDraft')}
            </Button>

            {status === 'DRAFT' && (
              <Button
                type='button'
                onClick={() => onPromote('APPROVED')}
                className='h-12 flex-1 shrink-0 rounded-xl border border-white/20 bg-blue-600 text-[10px] font-black tracking-widest text-white uppercase italic shadow-lg shadow-blue-600/10 transition-all hover:bg-blue-700 sm:h-full sm:w-48'
              >
                {t('engineering.bomArchive.dialog.submitReview')}
              </Button>
            )}

            {status === 'APPROVED' && isMBOM(currentRow) && (
              <Button
                type='button'
                onClick={() => onPromote('RELEASED')}
                className='h-12 flex-1 shrink-0 rounded-xl border border-white/20 bg-emerald-600 text-[10px] font-black tracking-widest text-white uppercase italic shadow-lg shadow-emerald-600/10 transition-all hover:bg-emerald-700 sm:h-full sm:w-48'
              >
                {t('engineering.bomArchive.dialog.release')}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
