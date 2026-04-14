'use client'

import { type ReactNode } from 'react'
import { XIcon } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TemplateEditorDialogLayoutProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  leftColumn: ReactNode
  middleColumn: ReactNode
  rightColumn: ReactNode
  footer: ReactNode
}

export function TemplateEditorDialogLayout({
  open,
  onOpenChange,
  title,
  description,
  leftColumn,
  middleColumn,
  rightColumn,
  footer,
}: TemplateEditorDialogLayoutProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className='flex max-h-[95vh] w-[99vw] max-w-none flex-col sm:w-[92vw] 2xl:w-[1680px] sm:max-w-none overflow-hidden rounded-[32px] border-none p-0 shadow-2xl'>
        <DialogHeader className='shrink-0 bg-muted/5 px-4 py-4 text-start sm:px-6 xl:px-7'>
          <div className='rounded-[24px] border border-dashed border-muted/40 bg-background/85 px-5 py-4 shadow-sm'>
            <div className='flex items-start justify-between gap-4'>
              <div className='min-w-0 flex-1'>
                <DialogTitle className='flex items-center gap-3 text-[16px] font-black tracking-tight italic uppercase text-slate-800'>
                  <div className='size-2 animate-pulse rounded-full bg-blue-600' />
                  {title}
                </DialogTitle>
                <DialogDescription className='mt-1 text-[9px] font-black uppercase tracking-[0.18em] opacity-60 text-muted-foreground/50'>
                  {description}
                </DialogDescription>
              </div>
              <DialogClose className='shrink-0 rounded-full border border-dashed border-muted/40 bg-muted/40 p-2 text-muted-foreground/70 transition hover:bg-muted/60 hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2'>
                <XIcon className='size-4' />
                <span className='sr-only'>Close</span>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 xl:px-7'>
          <div className='grid gap-4 lg:h-[72vh] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)_minmax(0,1fr)] lg:items-stretch'>
            <div className='min-w-0 rounded-[28px] border border-dashed border-muted/40 bg-muted/5 p-4 sm:p-5 lg:min-h-0 lg:overflow-y-auto'>
              {leftColumn}
            </div>
            <div className='min-w-0 rounded-[24px] border border-dashed border-muted/40 bg-muted/5 p-4 sm:p-5 lg:min-h-0 lg:overflow-y-auto'>
              {middleColumn}
            </div>
            <div className='min-w-0 rounded-[24px] border border-dashed border-blue-200/60 bg-blue-50/40 p-4 sm:p-5 lg:min-h-0 lg:overflow-y-auto'>
              {rightColumn}
            </div>
          </div>
        </div>

        <DialogFooter className='shrink-0 bg-muted/5 px-4 py-4 sm:px-6 xl:px-7'>
          <div className='flex w-full flex-col-reverse items-stretch justify-end gap-3 rounded-[24px] border border-dashed border-muted/40 bg-background/85 px-4 py-4 shadow-sm sm:flex-row sm:items-center'>
            {footer}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
