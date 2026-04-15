import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'
import { categoryLabelKey } from '../../vehicle-loading/data/vehicle-loading.utils'
import type { VehicleSpec } from '../../vehicle-loading/data/vehicle-loading.types'

type Props = {
  spec: VehicleSpec
}

export function VehicleSpecCardHeader({ spec }: Props) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-1'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='text-[15px] font-black tracking-tight leading-none text-foreground'>
          {spec.name}
        </div>
        <div className='uds-chip text-[10px] leading-none'>
          {spec.enabled ? t('logisticsConfig.vehicleSpecsLibrary.enabled') : t('logisticsConfig.vehicleSpecsLibrary.disabled')}
        </div>
      </div>

      <div className='flex flex-wrap gap-2'>
        <Badge className='border-none bg-primary/10 px-2 py-0 text-[10px] font-semibold leading-none text-primary'>{t(categoryLabelKey(spec.category))}</Badge>
        <Badge variant='outline' className='border-dashed px-2 py-0 text-[10px] font-semibold leading-none'>{`${spec.payloadKg.toFixed(0)} kg`}</Badge>
        <Badge variant='outline' className='border-dashed px-2 py-0 text-[10px] font-semibold leading-none'>{`${spec.volumeM3.toFixed(1)} m³ ${t('logisticsConfig.vehicleSpecsLibrary.usableVolumeBadge')}`}</Badge>
        <Badge variant='outline' className='border-dashed px-2 py-0 text-[10px] font-semibold leading-none'>{`${spec.nominalVolumeM3.toFixed(1)} m³ ${t('logisticsConfig.vehicleSpecsLibrary.nominalVolumeBadge')}`}</Badge>
      </div>
    </div>
  )
}
