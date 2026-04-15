import { useRef, useState, type ChangeEvent } from 'react'
import { Camera, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import { VEHICLE_PHOTO_VIEW_TYPES, type VehiclePhotoViewType } from '../data/vehicle-photo-manifest'
import { getVehiclePhotoViewTypeLabel } from '../data/vehicle-photo-view-type-label'
import type { VehicleSpec } from '../data/vehicle-loading.types'
import { useVehiclePhotoUpload } from '../hooks/use-vehicle-photo-upload'

const DEFAULT_VIEW_TYPE: VehiclePhotoViewType = 'exterior'

type Props = {
  vehicle: VehicleSpec
}

export function VehiclePhotoUploadPanel({ vehicle }: Props) {
  const { t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [viewType, setViewType] = useState<VehiclePhotoViewType>(DEFAULT_VIEW_TYPE)
  const uploadMutation = useVehiclePhotoUpload()

  const imageCount = vehicle.photoEntry?.images.length ?? 0
  const coverImageUrl = vehicle.photoEntry?.coverImageUrl

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await uploadMutation.mutateAsync({
        vehicleId: vehicle.id,
        file,
        viewType,
        caption: `${vehicle.name} - ${viewType}`,
        annotations: [],
      })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className='flex w-full flex-col gap-2 rounded-[22px] border border-dashed border-border/60 bg-muted/10 p-3 lg:w-[240px] lg:shrink-0'>
      <div className='text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60'>
        {t('logisticsConfig.vehiclePhotos.uploadTitle')}
      </div>

      <div className='overflow-hidden rounded-[18px] border border-border/55 bg-background/90'>
        {coverImageUrl ? (
          <img src={coverImageUrl} alt={vehicle.name} className='aspect-16/10 w-full object-cover' />
        ) : (
          <div className='flex aspect-16/10 items-center justify-center bg-muted/10'>
            <Camera className='size-7 text-muted-foreground/30' />
          </div>
        )}
      </div>

      <div className='rounded-[16px] border border-dashed border-border/50 bg-background/70 px-3 py-2 text-[10px] leading-5 text-muted-foreground'>
        {t('logisticsConfig.vehiclePhotos.uploadSummary', { count: imageCount })}
      </div>

      <Select value={viewType} onValueChange={(value) => setViewType(value as VehiclePhotoViewType)}>
        <SelectTrigger className='h-9 rounded-xl text-[12px]'>
          <SelectValue placeholder={t('logisticsConfig.vehiclePhotos.selectViewType')} />
        </SelectTrigger>
        <SelectContent>
          {VEHICLE_PHOTO_VIEW_TYPES.map((item) => (
            <SelectItem key={item} value={item}>
              {getVehiclePhotoViewTypeLabel(t, item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type='button'
        variant='outline'
        className='h-9 gap-2 rounded-xl text-[10px] font-black uppercase tracking-[0.18em]'
        disabled={uploadMutation.isPending}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploadMutation.isPending ? <Loader2 className='size-4 animate-spin' /> : <Upload className='size-4' />}
        {uploadMutation.isPending ? t('logisticsConfig.vehiclePhotos.uploading') : t('logisticsConfig.vehiclePhotos.uploadButton')}
      </Button>

      <div className='text-[10px] leading-5 text-muted-foreground/70'>
        {t('logisticsConfig.vehiclePhotos.uploadHint')}
      </div>

      <input ref={fileInputRef} type='file' accept='image/*' className='hidden' onChange={handleFileChange} />
    </div>
  )
}
