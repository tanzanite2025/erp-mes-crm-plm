import type { TranslationKey } from '@/locales'
import { type VehiclePhotoViewType } from './vehicle-photo-manifest'

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

const VEHICLE_PHOTO_VIEW_TYPE_LABEL_KEYS: Record<
  VehiclePhotoViewType,
  TranslationKey
> = {
  exterior: 'logisticsConfig.vehiclePhotos.viewTypes.exterior',
  sideDoorOpen: 'logisticsConfig.vehiclePhotos.viewTypes.sideDoorOpen',
  rearDoorInterior: 'logisticsConfig.vehiclePhotos.viewTypes.rearDoorInterior',
}

export function getVehiclePhotoViewTypeLabel(
  t: TranslateFn,
  viewType: VehiclePhotoViewType
): string {
  return t(VEHICLE_PHOTO_VIEW_TYPE_LABEL_KEYS[viewType])
}
