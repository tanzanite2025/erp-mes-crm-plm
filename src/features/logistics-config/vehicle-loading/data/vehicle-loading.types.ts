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

export type ShipmentSummary = {
  boxes: number
  totalVolumeM3: number
  totalWeightKg: number
}

export type PackageDimension = {
  lengthMm: number
  widthMm: number
  heightMm: number
  canRotate: boolean
  canInvert: boolean
}

export type VehicleLoadingPackageInput = {
  packageId: string
  profileId?: string
  name: string
  unitWeightKg: number
  dimension: PackageDimension
}

export type VehicleLoadingApiPackageDraft = {
  name: string
  unitWeightKg: string
  lengthMm: string
  widthMm: string
  heightMm: string
  canRotate: boolean
  canInvert: boolean
}

export type VehicleRecommendation = {
  vehicle: VehicleSpec
  packageDimension: PackageDimension
  vehiclesNeeded: number
  loadRateVolume: number
  loadRateWeight: number
  reason: string
  warning?: string
  selectedOrientationLabel?: string
  selectedOrientationAxis?: 'length' | 'width' | 'height'
  boxesPerLayer?: number
  layerCount?: number
  maxBoxesPerVehicle?: number
}
