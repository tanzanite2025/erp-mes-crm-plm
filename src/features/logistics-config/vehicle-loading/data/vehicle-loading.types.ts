import type { VehicleSpec } from '../../vehicle-specs/data/vehicle-specs.types'

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

export type VehicleLoadingPackageDraft = {
  name: string
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
