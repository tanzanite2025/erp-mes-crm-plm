import type { VehiclePhotoEntry } from './vehicle-photo-manifest'

export type VehicleCategory = 'van' | 'boxTruck' | 'lightTruck' | 'mediumTruck'

export type VehicleDimension = {
  lengthMm: number
  widthMm: number
  heightMm: number
}

export type VehicleSafetyAllowance = {
  topClearanceMm: number
  sideClearanceMm: number
  rearClearanceMm: number
}

export type VehicleLoadingConstraint = {
  doorWidthMm: number
  doorHeightMm: number
  wheelArchWidthMm: number
  wheelArchHeightMm: number
  hasCenterPillar: boolean
}

export type VehicleSpec = {
  id: string
  category: VehicleCategory
  name: string
  payloadKg: number
  volumeM3: number
  nominalVolumeM3: number
  physicalInnerSize: VehicleDimension
  usableInnerSize: VehicleDimension
  safetyAllowance: VehicleSafetyAllowance
  loadingConstraint: VehicleLoadingConstraint
  photoEntry: VehiclePhotoEntry
  isBoxBody: boolean
  enabled: boolean
  notes: string
}
