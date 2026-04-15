import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import type { VehicleRecommendation, VehicleSpec } from '../data/vehicle-loading.types'
import { VehicleEmptyState } from './vehicle-empty-state'
import { VehiclePhotoTriggerButton } from './vehicle-photo-trigger-button'

type Props = {
  recommendations: VehicleRecommendation[]
  onViewDiagram?: (recommendation: VehicleRecommendation) => void
  onViewPhoto?: (vehicle: VehicleSpec) => void
}

function percentText(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function VehicleRecommendationPanel({ recommendations, onViewDiagram, onViewPhoto }: Props) {
  const { t } = useLanguage()

  return (
    <div className='rounded-[22px] border border-dashed border-primary/20 bg-primary/5 px-5 py-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-[10px] font-black uppercase tracking-widest text-primary/70'>
          {t('logisticsConfig.vehicleLoading.recommendation.title')}
        </div>
        <Badge className='border-none bg-white/60 text-primary'>{t('logisticsConfig.vehicleLoading.badges.rules')}</Badge>
      </div>

      {recommendations.length === 0 ? (
        <div className='mt-3'>
          <VehicleEmptyState
            title={t('logisticsConfig.vehicleLoading.recommendation.emptyStateTitle')}
            description={t('logisticsConfig.vehicleLoading.recommendation.emptyStateDescription')}
          />
        </div>
      ) : (
        <div className='mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3'>
          {recommendations.map((rec) => (
            <div key={rec.vehicle.id} className='rounded-[18px] border border-dashed border-primary/20 bg-white/60 px-4 py-3'>
              <div className='text-sm font-black tracking-tight'>{rec.vehicle.name}</div>
              <div className='mt-1 text-[11px] text-primary/80'>
                {t('logisticsConfig.vehicleLoading.recommendation.vehiclesNeeded', {
                  count: rec.vehiclesNeeded,
                })}
              </div>
              <div className='mt-2 grid grid-cols-2 gap-2 text-[10px] text-primary/70'>
                <div>{t('logisticsConfig.vehicleLoading.recommendation.volumeUtilization')} {percentText(rec.loadRateVolume)}</div>
                <div>{t('logisticsConfig.vehicleLoading.recommendation.weightUtilization')} {percentText(rec.loadRateWeight)}</div>
              </div>
              {rec.warning ? <div className='mt-2 text-[10px] font-medium text-amber-600'>{rec.warning}</div> : null}
              <div className='mt-2 wrap-break-word font-mono text-[10px] leading-relaxed text-primary/70'>{rec.reason}</div>
              {onViewDiagram || onViewPhoto ? (
                <div className='mt-3 flex flex-wrap justify-end gap-2'>
                  {onViewPhoto ? <VehiclePhotoTriggerButton onClick={() => onViewPhoto(rec.vehicle)} /> : null}
                  {onViewDiagram ? (
                    <Button type='button' variant='outline' size='sm' onClick={() => onViewDiagram(rec)}>
                      查看示意图
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
