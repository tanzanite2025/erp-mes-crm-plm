import { useCallback, useMemo, useState } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { VehicleSpec } from '../data/vehicle-specs.types'
import {
  type VehiclePhotoAnnotation,
  type VehiclePhotoEntry,
  type VehiclePhotoImage,
  type VehiclePhotoViewType,
} from '../data/vehicle-photo-manifest'
import { getVehiclePhotoViewTypeLabel } from '../data/vehicle-photo-view-type-label'
import { VehiclePhotoDialogFooter } from './vehicle-photo-dialog-footer'
import { VehiclePhotoDialogHeader } from './vehicle-photo-dialog-header'
import { VehiclePhotoDialogPreview } from './vehicle-photo-dialog-preview'
import { VehiclePhotoDialogSidebar } from './vehicle-photo-dialog-sidebar'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: VehicleSpec | null
  photoEntry: VehiclePhotoEntry | null
}

export function VehiclePhotoDialog({
  open,
  onOpenChange,
  vehicle,
  photoEntry,
}: Props) {
  const { t } = useLanguage()
  const [activeImageId, setActiveImageId] = useState<string | null>(null)
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(
    null
  )

  const viewTypeLabel = useCallback(
    (viewType: VehiclePhotoViewType): string =>
      getVehiclePhotoViewTypeLabel(t, viewType),
    [t]
  )

  const images = useMemo(() => photoEntry?.images ?? [], [photoEntry])

  const activeImage = useMemo<VehiclePhotoImage | null>(() => {
    if (images.length === 0) return null
    return images.find((item) => item.id === activeImageId) ?? images[0]
  }, [activeImageId, images])

  const activeAnnotations = useMemo(
    () => activeImage?.annotations ?? [],
    [activeImage]
  )

  const activeAnnotation = useMemo<VehiclePhotoAnnotation | null>(() => {
    if (activeAnnotations.length === 0) return null
    return (
      activeAnnotations.find((item) => item.id === activeAnnotationId) ??
      activeAnnotations[0]
    )
  }, [activeAnnotationId, activeAnnotations])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] flex-col gap-0 rounded-[24px] border border-dashed border-border/60 bg-background/95 p-0 shadow-xl sm:max-w-[1240px]'>
        <VehiclePhotoDialogHeader vehicle={vehicle} photoEntry={photoEntry} />

        <div className='min-h-0 flex-1 overflow-hidden px-3 py-3 sm:px-4 sm:py-4'>
          <div className='grid min-h-0 gap-3 lg:grid-cols-[1.65fr_1fr]'>
            <VehiclePhotoDialogPreview
              photoEntry={photoEntry}
              activeImage={activeImage}
              activeAnnotations={activeAnnotations}
              activeAnnotationId={activeAnnotation?.id ?? null}
              onSelectAnnotation={setActiveAnnotationId}
              onSelectImage={setActiveImageId}
              viewTypeLabel={viewTypeLabel}
            />
            <VehiclePhotoDialogSidebar
              activeImage={activeImage}
              activeAnnotations={activeAnnotations}
              activeAnnotation={activeAnnotation}
              onSelectAnnotation={setActiveAnnotationId}
              viewTypeLabel={viewTypeLabel}
            />
          </div>
        </div>

        <VehiclePhotoDialogFooter onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
