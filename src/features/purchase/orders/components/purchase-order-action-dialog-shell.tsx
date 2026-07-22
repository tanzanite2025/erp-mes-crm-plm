import { type ReactNode } from 'react'
import { Calculator, ClipboardList, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PurchaseOrderActionDialogShellProps {
  open: boolean
  title: ReactNode
  description: string
  headerAccessory?: ReactNode
  totalLabel: string
  totalAmount: string
  currency: string
  isLoading: boolean
  syncingText: string
  cancelText: string
  saveText: string
  onOpenChange: (open: boolean) => void
  onSave: () => void
  children: ReactNode
}

export function PurchaseOrderActionDialogShell({
  open,
  title,
  description,
  headerAccessory,
  totalLabel,
  totalAmount,
  currency,
  isLoading,
  syncingText,
  cancelText,
  saveText,
  onOpenChange,
  onSave,
  children,
}: PurchaseOrderActionDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='full'
        showCloseButton={false}
        className='flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-[26px] border-none p-0 shadow-2xl transition-all duration-300 sm:h-[90vh] sm:max-h-[90vh] sm:w-[95vw] sm:max-w-[95vw] sm:rounded-[32px] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw]'
      >
        <div className='flex shrink-0 flex-col gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8'>
          <div className='flex min-w-0 items-center justify-between gap-3 sm:flex-1 sm:justify-start'>
            <div className='flex min-w-0 items-center gap-3'>
              <ClipboardList className='size-5 shrink-0 text-primary sm:size-6' />
              <DialogHeader className='min-w-0 flex-1 space-y-0 text-left sm:flex-row sm:flex-wrap sm:items-center sm:space-y-0 sm:gap-x-3 sm:gap-y-1'>
                <DialogTitle className='truncate text-base leading-tight font-black tracking-tighter text-slate-900 uppercase italic sm:text-lg lg:text-xl dark:text-white'>
                  {title}
                </DialogTitle>
                <DialogDescription className='hidden text-[9px] leading-none font-black tracking-widest text-muted-foreground/55 uppercase sm:block'>
                  {description}
                </DialogDescription>
              </DialogHeader>
            </div>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => onOpenChange(false)}
              className='size-8 shrink-0 rounded-full sm:hidden'
            >
              <X className='size-4' />
            </Button>
          </div>
          <div className='flex min-w-0 shrink-0 items-center justify-between gap-2.5 pl-8 sm:justify-end sm:pl-0'>
            {headerAccessory ? (
              <div className='flex min-w-0 flex-wrap items-center gap-2'>
                {headerAccessory}
              </div>
            ) : null}
            <Button
              variant='ghost'
              size='icon'
              onClick={() => onOpenChange(false)}
              className='hidden size-8 shrink-0 rounded-full sm:inline-flex'
            >
              <X className='size-4' />
            </Button>
          </div>
        </div>

        <div className='relative min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4'>
          {isLoading && (
            <div className='absolute inset-0 z-50 flex animate-in flex-col items-center justify-center space-y-4 rounded-[32px] bg-background/60 backdrop-blur-sm duration-300 fade-in'>
              <Loader2 className='size-10 animate-spin text-primary opacity-30' />
              <p className='animate-pulse text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                {syncingText}
              </p>
            </div>
          )}

          {children}
        </div>

        <div className='flex shrink-0 items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-8 sm:py-5'>
          <div className='flex min-w-0 items-center gap-3 sm:gap-6'>
            <div className='flex min-w-0 items-center gap-2 rounded-2xl bg-primary/5 px-3 py-2 sm:gap-2.5 sm:px-4'>
              <Calculator className='size-3.5 shrink-0 text-primary sm:size-4' />
              <div className='flex flex-col'>
                <span className='mb-0.5 text-[9px] leading-none font-black text-muted-foreground uppercase'>
                  {totalLabel}
                </span>
                <span className='truncate text-[14px] leading-none font-black text-primary sm:text-[15px]'>
                  {totalAmount}{' '}
                  <span className='text-[10px] opacity-60'>{currency}</span>
                </span>
              </div>
            </div>
          </div>
          <div className='flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='shrink-0 rounded-2xl px-3 py-5 text-[11px] font-black uppercase sm:p-5'
            >
              {cancelText}
            </Button>
            <Button
              onClick={onSave}
              className='min-w-0 flex-1 rounded-2xl bg-primary px-4 py-5 text-[11px] font-black uppercase shadow-xl shadow-primary/20 sm:flex-none sm:px-8'
            >
              {saveText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
