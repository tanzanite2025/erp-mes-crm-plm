import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'

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
        className='rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
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
        className='rounded-full px-6 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-primary/20'
      >
        <Plus className='size-4' />
        {t('logisticsConfig.suppliers.actions.add')}
      </Button>
    </div>
  )
}
