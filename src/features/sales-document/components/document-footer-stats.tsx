import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { type SalesOrder } from '@/features/trading/data/schema'

interface DocumentFooterStatsProps {
  formData: Partial<SalesOrder>
  onCancel: () => void
  onSave: () => void
  canSave?: boolean
}

export function DocumentFooterStats({
  formData,
  onCancel,
  onSave,
  canSave = true,
}: DocumentFooterStatsProps) {
  const { t } = useLanguage()

  return (
    <DialogFooter className='sticky bottom-0 z-20 flex flex-col items-stretch justify-between gap-4 border-t bg-background/90 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:gap-5 sm:px-6 sm:py-2'>
      <div className='grid grid-cols-3 gap-4 sm:flex sm:items-center sm:gap-6'>
        <div className='flex flex-col'>
          <span className='mb-1.5 text-[7px] leading-none font-bold tracking-widest text-muted-foreground/40 uppercase italic sm:text-[8px]'>
            {t('tradingSalesOrder.footer.items')}
          </span>
          <span className='text-base leading-none font-black tracking-tighter italic tabular-nums sm:text-lg'>
            {(formData.lines?.length || 0).toLocaleString()}
          </span>
        </div>
        <div className='flex flex-col'>
          <span className='mb-1.5 text-[7px] leading-none font-bold tracking-widest text-muted-foreground/40 uppercase italic sm:text-[8px]'>
            {t('tradingSalesOrder.footer.qty')}
          </span>
          <span className='text-base leading-none font-black tracking-tighter text-muted-foreground/70 tabular-nums sm:text-lg'>
            {(formData.quantity || 0).toLocaleString()}
          </span>
        </div>
        <div className='flex flex-col'>
          <span className='mb-1.5 text-[7px] leading-none font-bold tracking-widest text-amber-600/60 uppercase italic sm:text-[8px]'>
            {t('tradingSalesOrder.footer.amount')}
          </span>
          <span className='text-base leading-none font-black tracking-tighter text-primary italic tabular-nums sm:text-lg'>
            {formData.currency}{' '}
            {(formData.amount || 0).toLocaleString(undefined, {
              minimumFractionDigits: 1,
            })}
          </span>
        </div>
      </div>
      <div className='order-2 flex shrink-0 flex-col gap-2.5 sm:order-1 sm:flex-row sm:gap-3'>
        {canSave ? (
          <Button
            onClick={onSave}
            className='order-1 h-10 rounded-full bg-slate-950 px-8 text-[11px] font-black text-white uppercase shadow-xl shadow-slate-950/20 transition-all active:scale-95 sm:order-2 sm:px-12'
          >
            {t('tradingSalesOrder.footer.save')}
          </Button>
        ) : null}
        <Button
          variant='ghost'
          onClick={onCancel}
          className='order-2 h-10 rounded-full border border-muted-foreground/10 px-6 text-[11px] font-bold uppercase transition-all hover:bg-muted/50 sm:order-1'
        >
          {t('tradingSalesOrder.footer.cancel')}
        </Button>
      </div>
    </DialogFooter>
  )
}
