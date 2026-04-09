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
        'rounded-[32px] border-none shadow-2xl p-0 overflow-hidden w-[95vw] sm:max-w-[520px]',
        className
      )}>
        <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
        
        <div className='relative p-6 md:p-8'>
          <AlertDialogHeader className='text-start space-y-4'>
            <AlertDialogTitle className='text-base md:text-lg font-black tracking-tight leading-tight whitespace-normal break-words [overflow-wrap:anywhere]'>
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-[11px] md:text-[12px] font-bold text-muted-foreground/60 leading-relaxed whitespace-normal break-words [overflow-wrap:anywhere]'>
                {desc}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {children && <div className='mt-6'>{children}</div>}

          <AlertDialogFooter className='mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end'>
            <AlertDialogCancel 
              disabled={isLoading}
              className='w-full sm:flex-1 min-w-0 min-h-11 h-auto rounded-full px-4 py-3 hover:bg-muted font-black text-[11px] tracking-[0.12em] whitespace-normal break-words [overflow-wrap:anywhere] text-center leading-tight transition-colors border-none bg-muted/30 shadow-none'
            >
              {cancelBtnText ?? 'Cancel'}
            </AlertDialogCancel>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={disabled || isLoading}
              className={cn(
                'w-full sm:flex-1 min-w-0 min-h-11 h-auto rounded-full px-4 py-3 font-black text-[11px] tracking-[0.12em] whitespace-normal break-words [overflow-wrap:anywhere] text-center leading-tight transition-all active:scale-95 text-white',
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
