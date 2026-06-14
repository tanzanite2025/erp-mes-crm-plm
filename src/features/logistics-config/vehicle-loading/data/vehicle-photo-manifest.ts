export type VehiclePhotoViewType =
  | 'exterior'
  | 'sideDoorOpen'
  | 'rearDoorInterior'

export type VehiclePhotoAnnotation = {
  id: string
  xPercent: number
  yPercent: number
  title: string
  description: string
  tag?: string
}

export type VehiclePhotoImage = {
  id: string
  version: number
  url: string
  alt: string
  viewType: VehiclePhotoViewType
  caption?: string
  annotations: VehiclePhotoAnnotation[]
}

export type VehiclePhotoEntry = {
  vehicleId: string
  displayTitle: string
  description?: string
  coverImageUrl?: string
  tags: string[]
  images: VehiclePhotoImage[]
}

export const VEHICLE_PHOTO_VIEW_TYPES: VehiclePhotoViewType[] = [
  'exterior',
  'sideDoorOpen',
  'rearDoorInterior',
]
