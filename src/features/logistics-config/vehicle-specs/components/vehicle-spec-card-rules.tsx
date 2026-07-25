import { useLanguage } from '@/context/language-provider'
import type { VehicleSpec } from '../data/vehicle-specs.types'

type Props = {
  spec: VehicleSpec
}

export function VehicleSpecCardRules({ spec }: Props) {
  const { t } = useLanguage()

  return (
    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
      <div className='rounded-[22px] border border-border/70 bg-background/80 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:bg-muted/5'>
        <div className='text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/60 uppercase'>
          {t('logisticsConfig.vehicleSpecsLibrary.allowances')}
        </div>
        <div className='mt-1.5 space-y-1.5 text-[13px] leading-5 text-muted-foreground'>
          <div>{`${t('logisticsConfig.vehicleSpecsLibrary.topClearance')}: ${spec.safetyAllowance.topClearanceMm} mm`}</div>
          <div>{`${t('logisticsConfig.vehicleSpecsLibrary.sideClearance')}: ${spec.safetyAllowance.sideClearanceMm} mm`}</div>
          <div>{`${t('logisticsConfig.vehicleSpecsLibrary.rearClearance')}: ${spec.safetyAllowance.rearClearanceMm} mm`}</div>
        </div>
      </div>

      <div className='rounded-[22px] border border-border/70 bg-background/80 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:bg-muted/5'>
        <div className='text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/60 uppercase'>
          {t('logisticsConfig.vehicleSpecsLibrary.constraints')}
        </div>
        <div className='mt-1.5 space-y-1.5 text-[13px] leading-5 text-muted-foreground'>
          <div>{`${t('logisticsConfig.vehicleSpecsLibrary.door')}: ${spec.loadingConstraint.doorWidthMm} × ${spec.loadingConstraint.doorHeightMm} mm`}</div>
          <div>{`${t('logisticsConfig.vehicleSpecsLibrary.wheelArch')}: ${spec.loadingConstraint.wheelArchWidthMm} × ${spec.loadingConstraint.wheelArchHeightMm} mm`}</div>
          <div>{`${t('logisticsConfig.vehicleSpecsLibrary.centerPillar')}: ${spec.loadingConstraint.hasCenterPillar ? t('logisticsConfig.vehicleSpecsLibrary.yes') : t('logisticsConfig.vehicleSpecsLibrary.no')}`}</div>
        </div>
      </div>
    </div>
  )
}
