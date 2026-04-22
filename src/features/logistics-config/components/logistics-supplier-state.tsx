import { AlertTriangle, Loader2, Truck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

type LogisticsSupplierStateProps = {
  type: 'error' | 'loading' | 'empty'
  message?: string
}

export function LogisticsSupplierState({ type, message }: LogisticsSupplierStateProps) {
  const { t } = useLanguage()

  if (type === 'error') {
    return (
      <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-[32px] border border-dashed border-rose-200 bg-rose-50/60 text-rose-500'>
        <AlertTriangle className='size-10' />
        <p className='text-sm font-black uppercase tracking-widest'>
          {t('logisticsConfig.suppliers.errors.title')}
        </p>
        <p className='max-w-xl text-center text-[11px] text-rose-400'>
          {message}
        </p>
      </div>
    )
  }

  if (type === 'loading') {
    return (
      <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-[32px] border border-dashed border-slate-200 bg-white/70 text-slate-400'>
        <Loader2 className='size-10 animate-spin' />
        <p className='text-sm font-black uppercase tracking-widest'>
          {t('logisticsConfig.suppliers.loading')}
        </p>
      </div>
    )
  }

  return (
    <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-[32px] border border-dashed border-slate-200 text-slate-400'>
      <Truck className='size-12 opacity-30' />
      <p className='text-sm font-black uppercase tracking-widest'>
        {t('logisticsConfig.suppliers.emptyTitle')}
      </p>
      <p className='max-w-lg text-center text-[11px] text-muted-foreground'>
        {t('logisticsConfig.suppliers.emptyDescription')}
      </p>
    </div>
  )
}
