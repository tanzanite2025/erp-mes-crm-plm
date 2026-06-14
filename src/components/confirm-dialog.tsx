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
      <AlertDialogContent
        className={cn(
          'w-[95vw] overflow-hidden rounded-[32px] border-none p-0 shadow-2xl sm:max-w-[520px]',
          className
        )}
      >
        <div className='pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent' />

        <div className='relative p-6 md:p-8'>
          <AlertDialogHeader className='space-y-4 text-start'>
            <AlertDialogTitle className='text-base leading-tight font-black tracking-tight [overflow-wrap:anywhere] break-words whitespace-normal md:text-lg'>
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='text-[11px] leading-relaxed font-bold [overflow-wrap:anywhere] break-words whitespace-normal text-muted-foreground/60 md:text-[12px]'>
                {desc}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {children && <div className='mt-6'>{children}</div>}

          <AlertDialogFooter className='mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end'>
            <AlertDialogCancel
              disabled={isLoading}
              className='h-auto min-h-11 w-full min-w-0 rounded-full border-none bg-muted/30 px-4 py-3 text-center text-[11px] leading-tight font-black tracking-[0.12em] [overflow-wrap:anywhere] break-words whitespace-normal shadow-none transition-colors hover:bg-muted sm:flex-1'
            >
              {cancelBtnText ?? 'Cancel'}
            </AlertDialogCancel>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={disabled || isLoading}
              className={cn(
                'h-auto min-h-11 w-full min-w-0 rounded-full px-4 py-3 text-center text-[11px] leading-tight font-black tracking-[0.12em] [overflow-wrap:anywhere] break-words whitespace-normal text-white transition-all active:scale-95 sm:flex-1',
                !destructive &&
                  'bg-primary shadow-lg shadow-primary/20 hover:bg-primary/90'
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
