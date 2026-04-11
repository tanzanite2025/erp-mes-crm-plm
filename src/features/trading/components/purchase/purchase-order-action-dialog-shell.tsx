import { Calculator, ClipboardList, Loader2, X } from 'lucide-react'
import { type ReactNode } from 'react'
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
  title: string
  description: string
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
        showCloseButton={false}
        className='max-h-[92vh] max-w-[calc(100%-1rem)] overflow-y-auto rounded-[32px] border-none p-0 shadow-2xl lg:max-w-[1100px]'
      >
        <div className='sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 px-8 py-4 backdrop-blur-sm'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-lg font-black uppercase tracking-tighter text-slate-900 italic dark:text-white lg:text-xl'>
              <ClipboardList className='size-6 text-primary' />
              {title}
            </DialogTitle>
            <DialogDescription className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60'>
              {description}
            </DialogDescription>
          </DialogHeader>
          <Button variant='ghost' size='icon' onClick={() => onOpenChange(false)} className='rounded-full'>
            <X className='size-4' />
          </Button>
        </div>

        <div className='relative min-h-[400px] space-y-6 p-8'>
          {isLoading && (
            <div className='absolute inset-0 z-50 flex flex-col items-center justify-center space-y-4 rounded-[32px] bg-background/60 backdrop-blur-sm animate-in fade-in duration-300'>
              <Loader2 className='size-10 animate-spin text-primary opacity-30' />
              <p className='animate-pulse text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                {syncingText}
              </p>
            </div>
          )}

          {children}
        </div>

        <div className='sticky bottom-0 z-20 flex items-center justify-between border-t bg-background/95 px-8 py-5 backdrop-blur-sm'>
          <div className='flex items-center gap-6'>
            <div className='flex items-center gap-2.5 rounded-2xl bg-primary/5 px-4 py-2'>
              <Calculator className='size-4 text-primary' />
              <div className='flex flex-col'>
                <span className='mb-0.5 text-[9px] font-black uppercase leading-none text-muted-foreground'>
                  {totalLabel}
                </span>
                <span className='text-[15px] font-black leading-none text-primary'>
                  {totalAmount} <span className='text-[10px] opacity-60'>{currency}</span>
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
