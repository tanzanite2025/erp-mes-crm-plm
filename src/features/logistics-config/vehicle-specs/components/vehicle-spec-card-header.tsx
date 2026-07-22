import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import type { VehicleSpec } from '../data/vehicle-specs.types'
import { categoryLabelKey } from '../data/vehicle-specs.utils'

type Props = {
  spec: VehicleSpec
}

export function VehicleSpecCardHeader({ spec }: Props) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-1'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='text-[15px] leading-none font-black tracking-tight text-foreground'>
          {spec.name}
        </div>
        <div className='uds-chip text-[10px] leading-none'>
          {spec.enabled
            ? t('logisticsConfig.vehicleSpecsLibrary.enabled')
            : t('logisticsConfig.vehicleSpecsLibrary.disabled')}
        </div>
      </div>

      <div className='flex flex-wrap gap-2'>
        <Badge className='border-none bg-primary/10 px-2 py-0 text-[10px] leading-none font-semibold text-primary'>
          {t(categoryLabelKey(spec.category))}
        </Badge>
        <Badge
          variant='outline'
          className='border-dashed px-2 py-0 text-[10px] leading-none font-semibold'
        >{`${spec.payloadKg.toFixed(0)} kg`}</Badge>
        <Badge
          variant='outline'
          className='border-dashed px-2 py-0 text-[10px] leading-none font-semibold'
        >{`${spec.volumeM3.toFixed(1)} m³ ${t('logisticsConfig.vehicleSpecsLibrary.usableVolumeBadge')}`}</Badge>
        <Badge
          variant='outline'
          className='border-dashed px-2 py-0 text-[10px] leading-none font-semibold'
        >{`${spec.nominalVolumeM3.toFixed(1)} m³ ${t('logisticsConfig.vehicleSpecsLibrary.nominalVolumeBadge')}`}</Badge>
      </div>
    </div>
  )
}
