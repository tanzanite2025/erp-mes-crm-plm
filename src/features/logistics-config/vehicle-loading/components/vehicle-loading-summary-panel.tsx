import type { Dispatch, SetStateAction } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/context/language-provider'
import type { ShipmentSummary } from '../data/vehicle-loading.types'
import { FieldCard } from './field-card'

const fieldClass =
  'w-full h-11 min-h-11 rounded-2xl border border-border/50 bg-muted/40 px-4 py-0 text-sm font-medium leading-none shadow-sm shadow-black/5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:border-primary/30'
const labelClass = 'ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'

type Props = {
  summary: ShipmentSummary
  onSummaryChange: Dispatch<SetStateAction<ShipmentSummary>>
}

export function VehicleLoadingSummaryPanel({ summary, onSummaryChange }: Props) {
  const { t } = useLanguage()

  return (
    <FieldCard
      title={t('logisticsConfig.vehicleLoading.summary.title')}
      description={t('logisticsConfig.vehicleLoading.summary.note')}
      className='xl:col-span-1'
    >
      <div className='space-y-4'>
        <div className='grid grid-cols-3 gap-3'>
          <div className='space-y-2'>
            <Label className={labelClass}>{t('logisticsConfig.vehicleLoading.summary.boxes')}</Label>
            <Input
              className={fieldClass}
              inputMode='numeric'
              value={String(summary.boxes)}
              onChange={(event) =>
                onSummaryChange((prev) => ({
                  ...prev,
                  boxes: Number(event.target.value || 0),
                }))
              }
            />
          </div>
          <div className='space-y-2'>
            <Label className={labelClass}>{t('logisticsConfig.vehicleLoading.summary.volume')}</Label>
            <Input
              className={fieldClass}
              inputMode='decimal'
              value={String(summary.totalVolumeM3)}
              onChange={(event) =>
                onSummaryChange((prev) => ({
                  ...prev,
                  totalVolumeM3: Number(event.target.value || 0),
                }))
              }
            />
          </div>
          <div className='space-y-2'>
            <Label className={labelClass}>{t('logisticsConfig.vehicleLoading.summary.weight')}</Label>
            <Input
              className={fieldClass}
              inputMode='decimal'
              value={String(summary.totalWeightKg)}
              onChange={(event) =>
                onSummaryChange((prev) => ({
                  ...prev,
                  totalWeightKg: Number(event.target.value || 0),
                }))
              }
            />
          </div>
        </div>

        <div className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-[11px] leading-relaxed text-primary/80'>
          {t('logisticsConfig.vehicleLoading.summary.disclaimer')}
        </div>
      </div>
    </FieldCard>
  )
}
