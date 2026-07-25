import { useLanguage } from '@/context/language-provider'
import type { VehicleSpec } from '../data/vehicle-specs.types'

type Props = {
  spec: VehicleSpec
}

export function VehicleSpecCardMetrics({ spec }: Props) {
  const { t } = useLanguage()

  return (
    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
      <div className='rounded-[22px] border border-border/70 bg-background/80 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:bg-muted/10'>
        <div className='text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/60 uppercase'>
          {t('logisticsConfig.vehicleSpecsLibrary.physicalSize')}
        </div>
        <div className='mt-1.5 text-[13px] leading-tight font-semibold text-foreground tabular-nums'>
          {`${spec.physicalInnerSize.lengthMm} × ${spec.physicalInnerSize.widthMm} × ${spec.physicalInnerSize.heightMm} mm`}
        </div>
      </div>

      <div className='rounded-[22px] border border-primary/30 bg-primary/5 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)]'>
        <div className='text-[10px] font-semibold tracking-[0.18em] text-primary/70 uppercase'>
          {t('logisticsConfig.vehicleSpecsLibrary.usableSize')}
        </div>
        <div className='mt-1.5 text-[13px] leading-tight font-semibold text-primary tabular-nums'>
          {`${spec.usableInnerSize.lengthMm} × ${spec.usableInnerSize.widthMm} × ${spec.usableInnerSize.heightMm} mm`}
        </div>
      </div>
    </div>
  )
}
