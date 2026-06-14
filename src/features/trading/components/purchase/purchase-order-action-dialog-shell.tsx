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
        className='flex h-[95vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden rounded-[32px] border-none p-0 shadow-2xl transition-all duration-300 sm:h-[90vh] sm:max-h-[90vh] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw]'
      >
        <div className='flex shrink-0 items-center justify-between gap-4 border-b bg-background/95 px-8 py-3 backdrop-blur-sm'>
          <div className='flex min-w-0 flex-1 items-center gap-3'>
            <ClipboardList className='size-6 shrink-0 text-primary' />
            <DialogHeader className='min-w-0 flex-1 flex-row flex-wrap items-center space-y-0 gap-x-3 gap-y-1 text-left'>
              <DialogTitle className='text-lg font-black tracking-tighter text-slate-900 uppercase italic lg:text-xl dark:text-white'>
                {title}
              </DialogTitle>
              <DialogDescription className='text-[9px] leading-none font-black tracking-widest text-muted-foreground/55 uppercase'>
                {description}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className='flex shrink-0 items-center gap-2.5'>
            {headerAccessory ? (
              <div className='flex items-center gap-2.5'>{headerAccessory}</div>
            ) : null}
            <Button
              variant='ghost'
              size='icon'
              onClick={() => onOpenChange(false)}
              className='size-8 rounded-full'
            >
              <X className='size-4' />
            </Button>
          </div>
        </div>

        <div className='relative min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4'>
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

        <div className='flex shrink-0 items-center justify-between border-t bg-background/95 px-8 py-5 backdrop-blur-sm'>
          <div className='flex items-center gap-6'>
            <div className='flex items-center gap-2.5 rounded-2xl bg-primary/5 px-4 py-2'>
              <Calculator className='size-4 text-primary' />
              <div className='flex flex-col'>
                <span className='mb-0.5 text-[9px] leading-none font-black text-muted-foreground uppercase'>
                  {totalLabel}
                </span>
                <span className='text-[15px] leading-none font-black text-primary'>
                  {totalAmount}{' '}
                  <span className='text-[10px] opacity-60'>{currency}</span>
                </span>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='rounded-2xl p-5 text-[11px] font-black uppercase'
            >
              {cancelText}
            </Button>
            <Button
              onClick={onSave}
              className='rounded-2xl bg-primary p-5 px-8 text-[11px] font-black uppercase shadow-xl shadow-primary/20'
            >
              {saveText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
