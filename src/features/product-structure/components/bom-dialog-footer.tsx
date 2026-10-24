'use client'

import { Lock } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { type BOM } from '../data/schema'
import { isMBOM } from '../utils/bom-identity'

interface BOMDialogFooterProps {
  currentRow?: BOM
  onPromote?: (status: string) => Promise<void>
  isSubmitDisabled: boolean
}

export function BOMDialogFooter({
  currentRow,
  onPromote,
  isSubmitDisabled,
}: BOMDialogFooterProps) {
  const { t } = useLanguage()
  const status = currentRow?.status || 'DRAFT'
  const isLocked = currentRow?.isLocked || false

  return (
    <div className='flex h-auto shrink-0 items-stretch justify-end border-t border-dashed border-muted/50 pt-2 sm:min-h-12'>
      <div className='flex items-center gap-2'>
        {isLocked ? (
          <div className='flex items-center gap-2 px-6 text-muted-foreground/40'>
            <Lock className='size-3' />
            <span className='text-[10px] font-black tracking-widest uppercase'>
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
              className='h-12 flex-1 shrink-0 rounded-xl border-dashed border-muted-foreground/20 text-[10px] font-black tracking-widest uppercase transition-all hover:bg-muted/50 sm:h-full sm:w-32'
            >
              {t('engineering.bomArchive.dialog.saveDraft')}
            </Button>

            {status === 'DRAFT' && onPromote && (
              <Button
                type='button'
                onClick={() => onPromote('APPROVED')}
                className='h-12 flex-1 shrink-0 rounded-xl border border-white/20 bg-blue-600 text-[10px] font-black tracking-widest text-white uppercase shadow-lg shadow-blue-600/10 transition-all hover:bg-blue-700 sm:h-full sm:w-48'
              >
                {t('engineering.bomArchive.dialog.submitReview')}
              </Button>
            )}
          </>
        )}
        {status === 'APPROVED' && onPromote && (
          <Button
            type='button'
            onClick={() => onPromote('RELEASED')}
            className='h-12 flex-1 shrink-0 rounded-xl border border-white/20 bg-emerald-600 text-[10px] font-black tracking-widest text-white uppercase shadow-lg shadow-emerald-600/10 transition-all hover:bg-emerald-700 sm:h-full sm:w-48'
          >
            {t(
              isMBOM(currentRow)
                ? 'engineering.bomArchive.dialog.release'
                : 'engineering.bomArchive.dialog.releaseEngineering'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
