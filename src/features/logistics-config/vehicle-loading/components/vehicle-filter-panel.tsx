import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import type { VehicleCategory } from '../../data/vehicle-loading.types'
import { FieldCard } from './field-card'

const fieldClass =
  'w-full h-11 min-h-11 rounded-2xl border border-border/50 bg-muted/40 px-4 py-0 text-sm font-medium leading-none shadow-sm shadow-black/5 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/15 focus-visible:border-primary/30'
const labelClass = 'ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'

type Props = {
  category: VehicleCategory | 'all'
  minVolumeM3: string
  minPayloadKg: string
  onCategoryChange: (value: VehicleCategory | 'all') => void
  onMinVolumeM3Change: (value: string) => void
  onMinPayloadKgChange: (value: string) => void
}

export function VehicleFilterPanel({
  category,
  minVolumeM3,
  minPayloadKg,
  onCategoryChange,
  onMinVolumeM3Change,
  onMinPayloadKgChange,
}: Props) {
  const { t } = useLanguage()

  return (
    <FieldCard title={t('logisticsConfig.vehicleLoading.vehicleSpecs.title')} description={t('logisticsConfig.vehicleLoading.vehicleSpecs.note')}>
      <div className='space-y-4'>
        <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
          <div className='space-y-2'>
            <Label className={labelClass}>{t('logisticsConfig.vehicleLoading.filters.category')}</Label>
            <Select value={category} onValueChange={(value) => onCategoryChange(value as VehicleCategory | 'all')}>
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder={t('logisticsConfig.vehicleLoading.filters.categoryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>{t('logisticsConfig.vehicleLoading.filters.all')}</SelectItem>
                <SelectItem value='van'>{t('logisticsConfig.vehicleLoading.filters.van')}</SelectItem>
                <SelectItem value='boxTruck'>{t('logisticsConfig.vehicleLoading.filters.boxTruck')}</SelectItem>
                <SelectItem value='lightTruck'>{t('logisticsConfig.vehicleLoading.filters.lightTruck')}</SelectItem>
                <SelectItem value='mediumTruck'>{t('logisticsConfig.vehicleLoading.filters.mediumTruck')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label className={labelClass}>{t('logisticsConfig.vehicleLoading.filters.minVolume')}</Label>
            <Input className={fieldClass} inputMode='decimal' value={minVolumeM3} onChange={(event) => onMinVolumeM3Change(event.target.value)} />
          </div>
          <div className='space-y-2'>
            <Label className={labelClass}>{t('logisticsConfig.vehicleLoading.filters.minPayload')}</Label>
            <Input className={fieldClass} inputMode='decimal' value={minPayloadKg} onChange={(event) => onMinPayloadKgChange(event.target.value)} />
          </div>
        </div>
      </div>
    </FieldCard>
  )
}
