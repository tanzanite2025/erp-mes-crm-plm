'use client'

import { ScanLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'

interface QuickActionHandleProps {
  isOpen: boolean
  onToggle: () => void
  placement?: 'floating' | 'dock'
}

export function QuickActionHandle({
  isOpen,
  onToggle,
  placement = 'floating',
}: QuickActionHandleProps) {
  const { t } = useLanguage()
  const isDock = placement === 'dock'

  return (
    <Button
      type='button'
      size='icon'
      onClick={onToggle}
      aria-label={t('quickActions.handle.ariaLabel')}
      className={cn(
        'border border-primary/20 bg-primary/95 text-primary-foreground shadow-xl shadow-primary/15 transition-all hover:bg-primary',
        'dark:border-primary/30 dark:bg-primary/10 dark:text-primary dark:shadow-primary/5 dark:hover:bg-primary dark:hover:text-primary-foreground',
        isDock
          ? 'size-11 rounded-full px-0 active:scale-95 sm:active:scale-100'
          : 'fixed top-1/2 right-0 z-40 h-28 w-11 -translate-y-1/2 rounded-l-2xl rounded-r-none border-r-0 px-0 shadow-2xl shadow-primary/20 hover:w-12',
        isOpen &&
          (isDock
            ? 'bg-primary text-primary-foreground ring-2 ring-primary/20 dark:bg-primary dark:text-primary-foreground'
            : 'w-12 bg-primary')
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center',
          isDock ? 'size-full' : 'h-full flex-col gap-2'
        )}
      >
        <ScanLine className='size-4' />
        {!isDock && (
          <span className='text-[10px] font-black tracking-widest uppercase [writing-mode:vertical-rl]'>
            {t('quickActions.handle.label')}
          </span>
        )}
      </div>
    </Button>
  )
}
