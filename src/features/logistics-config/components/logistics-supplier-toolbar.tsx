import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'

type LogisticsSupplierToolbarProps = {
  isFetching: boolean
  onRefresh: () => void
  onAdd: () => void
}

export function LogisticsSupplierToolbar({
  isFetching,
  onRefresh,
  onAdd,
}: LogisticsSupplierToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-wrap items-center gap-3'>
      <Button
        type='button'
        variant='outline'
        onClick={onRefresh}
        disabled={isFetching}
        className='rounded-full px-5 text-[10px] font-black uppercase tracking-widest'
      >
        {isFetching ? (
          <Loader2 className='size-4 animate-spin' />
        ) : (
          <RefreshCw className='size-4' />
        )}
        {t('logisticsConfig.suppliers.actions.refresh')}
      </Button>

      <Button
        type='button'
        onClick={onAdd}
        className='rounded-full px-6 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20'
      >
        <Plus className='size-4' />
        {t('logisticsConfig.suppliers.actions.add')}
      </Button>
    </div>
  )
}
