import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import type { VehiclePhotoAnnotation, VehiclePhotoImage, VehiclePhotoViewType } from '../data/vehicle-photo-manifest'

type Props = {
  activeImage: VehiclePhotoImage | null
  activeAnnotations: VehiclePhotoAnnotation[]
  activeAnnotation: VehiclePhotoAnnotation | null
  onSelectAnnotation: (id: string) => void
  viewTypeLabel: (viewType: VehiclePhotoViewType) => string
}

export function VehiclePhotoDialogSidebar({
  activeImage,
  activeAnnotations,
  activeAnnotation,
  onSelectAnnotation,
  viewTypeLabel,
}: Props) {
  const { t } = useLanguage()

  return (
    <div className='flex min-h-0 flex-col gap-3'>
      <div className='rounded-[22px] border border-dashed border-border/60 bg-muted/10 p-3'>
        <div className='text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60'>
          {t('logisticsConfig.vehiclePhotos.metadataTitle')}
        </div>
        <div className='mt-3 space-y-3'>
          <div className='rounded-[16px] border border-dashed border-primary/20 bg-primary/5 px-3 py-3'>
            <div className='text-[10px] font-black uppercase tracking-[0.18em] text-primary/70'>{t('logisticsConfig.vehiclePhotos.currentView')}</div>
            <div className='mt-1.5 text-[12px] font-semibold leading-5 text-foreground'>
              {activeImage ? viewTypeLabel(activeImage.viewType) : t('logisticsConfig.vehiclePhotos.noImageSelected')}
            </div>
          </div>

          <div className='rounded-[16px] border border-dashed border-border/50 bg-background/70 px-3 py-3'>
            <div className='text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60'>
              {t('logisticsConfig.vehiclePhotos.annotationTitle')}
            </div>
            {activeAnnotations.length > 0 ? (
              <div className='mt-3 space-y-2'>
                {activeAnnotations.map((annotation, index) => {
                  const selected = annotation.id === activeAnnotation?.id
                  return (
                    <button
                      key={annotation.id}
                      type='button'
                      onClick={() => onSelectAnnotation(annotation.id)}
                      className={cn(
                        'w-full rounded-2xl border px-3 py-3 text-left transition',
                        selected
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                          : 'border-border/55 bg-background hover:border-primary/40'
                      )}
                    >
                      <div className='flex items-center gap-2'>
                        <div className='flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary'>
                          {index + 1}
                        </div>
                        <div className='text-[12px] font-semibold leading-5 text-foreground'>{annotation.title}</div>
                      </div>
                      {annotation.tag ? (
                        <div className='mt-2'>
                          <Badge variant='outline' className='px-2 py-0 text-[10px] font-semibold leading-none'>
                            {annotation.tag}
                          </Badge>
                        </div>
                      ) : null}
                      <div className='mt-1.5 text-[11px] leading-5 text-muted-foreground'>{annotation.description}</div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className='mt-3 rounded-[14px] border border-dashed border-border/50 bg-background/70 px-3 py-3 text-[12px] leading-5 text-muted-foreground'>
                {t('logisticsConfig.vehiclePhotos.annotationEmpty')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
