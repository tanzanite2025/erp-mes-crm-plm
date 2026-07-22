import { useLanguage } from '@/context/language-provider'
import { Card } from '@/components/ui/card'

export function VehicleSpecsLoadingState() {
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

export function VehicleSpecsEmptyState({ search }: EmptyStateProps) {
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
