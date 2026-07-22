import { useLanguage } from '@/context/language-provider'
import { Card } from '@/components/ui/card'

export {
  VehicleSpecsEmptyState as VehicleSpecsLibraryEmptyState,
  VehicleSpecsLoadingState as VehicleSpecsLibraryLoadingState,
} from '../../vehicle-specs/components/vehicle-specs-query-states'

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
