import { AlertTriangle, Loader2, Truck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'

type LogisticsPlatformStateProps = {
  type: 'error' | 'loading' | 'empty'
  message?: string
}

export function LogisticsPlatformState({ type, message }: LogisticsPlatformStateProps) {
  const { t } = useLanguage()

  if (type === 'error') {
    return (
      <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-[40px] border-2 border-dashed border-rose-200 bg-rose-50/60 text-rose-500'>
        <AlertTriangle className='size-10' />
        <p className='text-sm font-black uppercase tracking-widest'>
          {t('logisticsConfig.platforms.states.loadErrorTitle')}
        </p>
        <p className='max-w-xl text-center text-[10px] font-bold text-rose-400'>
          {message}
        </p>
      </div>
    )
  }

  if (type === 'loading') {
    return (
      <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-[40px] border-2 border-dashed border-slate-200 bg-white/70 text-slate-400'>
        <Loader2 className='size-10 animate-spin' />
        <p className='text-sm font-black uppercase tracking-widest'>
          {t('logisticsConfig.platforms.states.loading')}
        </p>
      </div>
    )
  }

  return (
    <div className='flex h-64 flex-col items-center justify-center gap-3 rounded-[40px] border-2 border-dashed border-slate-200 text-slate-300'>
      <Truck className='size-12 opacity-20' />
      <span className='text-sm font-black italic uppercase tracking-tighter'>
        {t('logisticsConfig.platforms.states.emptyTitle')}
      </span>
      <span className='text-[10px] font-bold text-slate-300'>
        {t('logisticsConfig.platforms.states.emptyDescription')}
      </span>
    </div>
  )
}
