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
          <span className='text-[8px] font-black tracking-[0.3em] text-muted-foreground uppercase italic opacity-40 lg:text-[9px]'>
            {t('quality.standards.dialog.detail.footerHint')}
          </span>
        </div>
        <div className='flex w-full gap-2 sm:w-auto lg:gap-3'>
          <Button
            variant='ghost'
            className='h-10 flex-1 rounded-xl px-6 text-[10px] font-black uppercase opacity-50 transition-opacity hover:bg-white/5 lg:h-11 lg:flex-none lg:text-xs'
            onClick={onClose}
          >
            {closeLabel}
          </Button>
          {showPrimaryAction ? (
            <Button
              className='h-10 flex-1 rounded-xl bg-primary px-8 text-[10px] font-black text-primary-foreground uppercase shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95 lg:h-11 lg:flex-none lg:px-12 lg:text-xs'
              onClick={onPrimaryAction}
            >
              <Check className='mr-2 size-3.5 lg:size-4' />
              {primaryActionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
