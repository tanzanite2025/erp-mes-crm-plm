import { Check } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'

interface StandardPreviewFooterProps {
  onClose: () => void
  closeLabel: string
  primaryActionLabel: string
  onPrimaryAction: () => void
  showPrimaryAction?: boolean
}

export function StandardPreviewFooter({
  onClose,
  closeLabel,
  primaryActionLabel,
  onPrimaryAction,
  showPrimaryAction = true,
}: StandardPreviewFooterProps) {
  const { t } = useLanguage()

  return (
    <div className='shrink-0 rounded-b-2xl border-t border-white/5 bg-muted/40 p-4 lg:rounded-b-[2.5rem] lg:p-6'>
      <div className='flex flex-col items-center justify-between gap-4 sm:flex-row'>
        <div className='flex items-center gap-3'>
          <div className='size-1.5 animate-pulse rounded-full bg-primary/40' />
          <span className='text-[8px] font-black tracking-[0.3em] text-muted-foreground uppercase opacity-40 lg:text-[9px]'>
            {t('quality.standards.dialog.detail.footerHint')}
          </span>
        </div>
        <div className='flex w-full gap-2 sm:w-auto lg:gap-3'>
          <Button
            variant='outline'
            className='flex-1 rounded-full sm:flex-none'
            onClick={onClose}
          >
            {closeLabel}
          </Button>
          {showPrimaryAction ? (
            <Button
              className='flex-1 rounded-full sm:flex-none'
              onClick={onPrimaryAction}
            >
              <Check className='size-3.5' />
              {primaryActionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
