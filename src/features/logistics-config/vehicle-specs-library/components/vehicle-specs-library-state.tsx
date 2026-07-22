import { useLanguage } from '@/context/language-provider'
import { Card } from '@/components/ui/card'

type ErrorStateProps = {
  message: string
  onRetry: () => void
}

export function VehicleSpecsLibraryErrorState({
  message,
  onRetry,
}: ErrorStateProps) {
  const { t } = useLanguage()

  return (
    <Card className='rounded-[24px] border border-dashed border-destructive/30 bg-destructive/5 px-5 py-5'>
      <div className='text-[10px] font-black tracking-[0.18em] text-destructive uppercase'>
        {t('logisticsConfig.vehicleSpecsLibrary.errorTitle')}
      </div>
      <div className='mt-1.5 text-[12px] leading-5 text-muted-foreground'>
        {message}
      </div>
      <button
        type='button'
        onClick={onRetry}
        className='mt-3 uds-chip border-destructive/40 text-[10px] text-destructive'
      >
        {t('logisticsConfig.vehicleSpecsLibrary.retry')}
      </button>
    </Card>
  )
}

export function VehicleSpecsLibraryLoadingState() {
  const { t } = useLanguage()

  return (
    <Card className='rounded-[24px] border border-dashed border-border/60 bg-background/70 px-5 py-6'>
      <div className='text-[10px] font-black tracking-[0.18em] uppercase'>
        {t('logisticsConfig.vehicleSpecsLibrary.loading')}
      </div>
    </Card>
  )
}

type EmptyStateProps = {
  search: string
}

export function VehicleSpecsLibraryEmptyState({ search }: EmptyStateProps) {
  const { t } = useLanguage()
  const hasSearch = search.trim().length > 0

  return (
    <Card className='rounded-[24px] border border-dashed border-border/60 bg-background/70 px-5 py-6'>
      <div className='text-[10px] font-black tracking-[0.18em] uppercase'>
        {hasSearch
          ? t('logisticsConfig.vehicleSpecsLibrary.noSearchResults')
          : t('logisticsConfig.vehicleSpecsLibrary.emptyTitle')}
      </div>
      <div className='mt-1.5 text-[12px] leading-5 text-muted-foreground'>
        {hasSearch
          ? t('logisticsConfig.vehicleSpecsLibrary.noSearchResultsDescription')
          : t('logisticsConfig.vehicleSpecsLibrary.emptyDescription')}
      </div>
    </Card>
  )
}
