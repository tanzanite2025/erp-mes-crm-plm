'use client'

import { ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QuickActionHandleProps {
  isOpen: boolean
  onToggle: () => void
}

export function QuickActionHandle({ isOpen, onToggle }: QuickActionHandleProps) {
  return (
    <Button
      type='button'
      size='icon'
      onClick={onToggle}
      aria-label='打开快捷扫描入口'
      className={cn(
        'fixed right-0 top-1/2 z-40 h-28 w-11 -translate-y-1/2 rounded-l-2xl rounded-r-none border border-r-0 border-primary/20 bg-primary/95 px-0 text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:w-12 hover:bg-primary',
        isOpen && 'w-12 bg-primary'
      )}
    >
      <div className='flex h-full flex-col items-center justify-center gap-2'>
        <ScanLine className='size-4' />
        <span className='text-[10px] font-black uppercase tracking-widest [writing-mode:vertical-rl]'>快捷扫描</span>
      </div>
    </Button>
  )
}
