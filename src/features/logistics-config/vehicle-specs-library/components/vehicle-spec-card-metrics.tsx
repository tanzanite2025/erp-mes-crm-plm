import { useLanguage } from '@/context/language-provider'
import type { VehicleSpec } from '../../vehicle-loading/data/vehicle-loading.types'

type Props = {
  spec: VehicleSpec
}

export function VehicleSpecCardMetrics({ spec }: Props) {
  const { t } = useLanguage()

  return (
    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
      <div className='rounded-[22px] border border-dashed border-border/60 bg-muted/10 px-4 py-3'>
        <div className='text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60'>
          {t('logisticsConfig.vehicleSpecsLibrary.physicalSize')}
        </div>
        <div className='mt-1.5 text-[13px] font-semibold leading-tight text-foreground tabular-nums'>
          {`${spec.physicalInnerSize.lengthMm} × ${spec.physicalInnerSize.widthMm} × ${spec.physicalInnerSize.heightMm} mm`}
        </div>
      </div>

      <div className='rounded-[22px] border border-dashed border-primary/25 bg-primary/5 px-4 py-3'>
        <div className='text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70'>
          {t('logisticsConfig.vehicleSpecsLibrary.usableSize')}
        </div>
        <div className='mt-1.5 text-[13px] font-semibold leading-tight text-primary tabular-nums'>
          {`${spec.usableInnerSize.lengthMm} × ${spec.usableInnerSize.widthMm} × ${spec.usableInnerSize.heightMm} mm`}
        </div>
      </div>
    </div>
  )
}
