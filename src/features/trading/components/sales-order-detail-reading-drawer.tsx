import type { ReactNode } from 'react'
import { useLanguage } from '@/context/language-provider'
import { FloatingSurfaceCloseButton } from '@/components/ui/floating-surface-close-button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export function SalesOrderDetailReadingDrawer({
  open,
  onOpenChange,
  children,
  orderNo,
  customerName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  orderNo?: string
  customerName?: string
}) {
  const { t } = useLanguage()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='bottom'
        showCloseButton={false}
        data-mobile-floating-surface-layout='column'
        className='h-auto max-h-[85dvh] gap-0 overflow-hidden rounded-t-2xl border-t border-border bg-background p-0 shadow-2xl'
      >
        <SheetHeader className='shrink-0 flex-row items-center gap-3 border-b border-border bg-background px-4 py-2'>
          <div className='flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1'>
            <SheetTitle className='text-base font-semibold [overflow-wrap:anywhere]'>
              {t('tradingSalesOrder.tabs.detail')}
              {orderNo?.trim() ? ` · ${orderNo}` : ''}
            </SheetTitle>
            <SheetDescription className='min-w-0 [overflow-wrap:anywhere]'>
              {customerName?.trim() ||
                t('tradingSalesOrder.detail.readingLayout.description')}
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <FloatingSurfaceCloseButton
              aria-label={t('common.actions.close')}
              className='shrink-0'
            />
          </SheetClose>
        </SheetHeader>
        <div
          data-mobile-floating-surface-scroll-body
          className='min-h-0 overflow-y-auto overscroll-contain bg-muted/40'
        >
          <div className='w-full min-w-0 p-3 sm:p-4'>{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
