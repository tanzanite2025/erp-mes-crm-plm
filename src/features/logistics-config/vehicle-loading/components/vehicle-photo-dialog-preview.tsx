import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import {
  VEHICLE_PHOTO_VIEW_TYPES,
  type VehiclePhotoAnnotation,
  type VehiclePhotoEntry,
  type VehiclePhotoImage,
  type VehiclePhotoViewType,
} from '../data/vehicle-photo-manifest'

type Props = {
  photoEntry: VehiclePhotoEntry | null
  activeImage: VehiclePhotoImage | null
  activeAnnotations: VehiclePhotoAnnotation[]
  activeAnnotationId: string | null
  onSelectAnnotation: (id: string) => void
  onSelectImage: (id: string) => void
  viewTypeLabel: (viewType: VehiclePhotoViewType) => string
}

export function VehiclePhotoDialogPreview({
  photoEntry,
  activeImage,
  activeAnnotations,
  activeAnnotationId,
  onSelectAnnotation,
  onSelectImage,
  viewTypeLabel,
}: Props) {
  const { t } = useLanguage()

  return (
    <div className='flex min-h-0 flex-col gap-3'>
      <div className='rounded-[22px] border border-dashed border-border/60 bg-muted/10 p-3'>
        <div className='mb-3 flex flex-wrap gap-2'>
          {(photoEntry?.tags ?? []).map((tag) => (
            <Badge key={tag} variant='outline' className='px-2 py-0 text-[10px] font-semibold leading-none'>
              {tag}
            </Badge>
          ))}
          {activeImage ? (
            <Badge variant='secondary' className='px-2 py-0 text-[10px] font-semibold leading-none'>
              {viewTypeLabel(activeImage.viewType)}
            </Badge>
          ) : null}
        </div>

        <div className='relative overflow-hidden rounded-[18px] border border-border/55 bg-black/5'>
          {activeImage ? (
            <div className='relative aspect-16/10 w-full bg-muted/10'>
              <img src={activeImage.url} alt={activeImage.alt} className='size-full object-contain' />
              {activeAnnotations.map((annotation, index) => {
                const active = activeAnnotationId === annotation.id
                return (
                  <button
                    key={annotation.id}
                    type='button'
                    onClick={() => onSelectAnnotation(annotation.id)}
                    className={cn(
                      'absolute z-10 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-black shadow-lg transition',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-white/80 bg-background/95 text-foreground hover:border-primary hover:text-primary'
                    )}
                    style={{ left: `${annotation.xPercent}%`, top: `${annotation.yPercent}%` }}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className='flex aspect-16/10 items-center justify-center px-6 py-8'>
              <div className='max-w-xl text-center'>
                <div className='text-[13px] font-black leading-none text-foreground'>
                  {t('logisticsConfig.vehiclePhotos.emptyTitle')}
                </div>
                <div className='mt-1.5 text-[12px] leading-5 text-muted-foreground'>
                  {t('logisticsConfig.vehiclePhotos.emptyDescription')}
                </div>
                <div className='mt-3 flex flex-wrap justify-center gap-2'>
                  {VEHICLE_PHOTO_VIEW_TYPES.map((viewType) => (
                    <Badge key={viewType} variant='outline' className='px-2 py-0 text-[10px] font-semibold leading-none'>
                      {viewTypeLabel(viewType)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {activeImage?.caption ? (
          <div className='mt-3 rounded-[16px] border border-dashed border-border/50 bg-background/70 px-3 py-2 text-[10px] leading-5 text-muted-foreground'>
            {activeImage.caption}
          </div>
        ) : null}
      </div>

      {photoEntry?.images?.length ? (
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
          {photoEntry.images.map((image) => {
            const selected = image.id === activeImage?.id
            return (
              <button
                key={image.id}
                type='button'
                onClick={() => onSelectImage(image.id)}
                className={cn(
                  'overflow-hidden rounded-[20px] border bg-background text-left transition',
                  selected ? 'border-primary shadow-md shadow-primary/10' : 'border-border/55 hover:border-primary/50'
                )}
              >
                <div className='aspect-16/10 w-full bg-muted/10'>
                  <img src={image.url} alt={image.alt} className='size-full object-cover' />
                </div>
                <div className='px-3 py-2'>
                  <div className='text-[11px] font-black text-foreground'>{viewTypeLabel(image.viewType)}</div>
                  <div className='mt-1 text-[11px] leading-relaxed text-muted-foreground'>{image.caption || image.alt}</div>
                </div>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
