import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  disabled?: boolean
  desc: React.JSX.Element | string
  cancelBtnText?: string
  confirmText?: React.ReactNode
  destructive?: boolean
  handleConfirm: () => void
  isLoading?: boolean
  className?: string
  children?: React.ReactNode
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    title,
    desc,
    children,
    className,
    confirmText,
    cancelBtnText,
    destructive,
    isLoading,
    disabled = false,
    handleConfirm,
    ...actions
  } = props
  return (
    <AlertDialog {...actions}>
      <AlertDialogContent className={cn(
        'rounded-[32px] border-none shadow-2xl p-0 overflow-hidden w-[95vw] sm:max-w-[420px]',
        className
      )}>
        <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
        
        <div className='relative p-6 md:p-8'>
          <AlertDialogHeader className='text-start space-y-4'>
            <AlertDialogTitle className='text-base md:text-lg font-black tracking-tighter uppercase italic'>
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-[11px] md:text-[12px] font-bold text-muted-foreground/60 leading-relaxed'>
                {desc}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {children && <div className='mt-6'>{children}</div>}

          <AlertDialogFooter className='mt-8 flex flex-row items-center justify-end gap-3'>
            <AlertDialogCancel 
              disabled={isLoading}
              className='flex-1 h-11 rounded-full hover:bg-muted font-black text-[10px] uppercase tracking-widest transition-colors border-none bg-muted/30 shadow-none'
            >
              {cancelBtnText ?? 'Cancel'}
            </AlertDialogCancel>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={disabled || isLoading}
              className={cn(
                'flex-1 h-11 rounded-full font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 text-white',
                !destructive && 'bg-primary shadow-lg shadow-primary/20 hover:bg-primary/90'
              )}
            >
              {confirmText ?? 'Continue'}
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
