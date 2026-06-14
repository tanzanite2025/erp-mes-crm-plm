import { useLanguage } from '@/context/language-provider'
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { VehicleSpec } from '../data/vehicle-loading.types'
import type { VehiclePhotoEntry } from '../data/vehicle-photo-manifest'

type Props = {
  vehicle: VehicleSpec | null
  photoEntry: VehiclePhotoEntry | null
}

export function VehiclePhotoDialogHeader({ vehicle, photoEntry }: Props) {
  const { t } = useLanguage()

  return (
    <DialogHeader className='shrink-0 border-b border-dashed border-border/60 px-4 py-3 sm:px-5'>
      <DialogTitle className='text-[15px] leading-none font-black tracking-tight'>
        {photoEntry?.displayTitle ??
          vehicle?.name ??
          t('logisticsConfig.vehiclePhotos.dialogTitle')}
      </DialogTitle>
      <DialogDescription className='mt-1 text-[12px] leading-5 text-muted-foreground'>
        {photoEntry?.description ??
          t('logisticsConfig.vehiclePhotos.dialogDescription')}
      </DialogDescription>
    </DialogHeader>
  )
}
