import { useLanguage } from '@/context/language-provider'

export function ProductBindingHistoryEmptyState() {
  const { t } = useLanguage()

  return (
    <div className='flex min-h-[320px] items-center justify-center px-6 py-8 text-center'>
      <p className='max-w-md text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
        {t('cuttingOperations.productBinding.history.empty')}
      </p>
    </div>
  )
}
