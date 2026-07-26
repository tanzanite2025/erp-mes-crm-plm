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

export type VehicleLoadingOrientationAxis = 'length' | 'width' | 'height'

export type VehicleLoadingOrientation = {
  label: string
  lengthAxis: VehicleLoadingOrientationAxis
  widthAxis: VehicleLoadingOrientationAxis
  heightAxis: VehicleLoadingOrientationAxis
  lengthMm: number
  widthMm: number
  heightMm: number
}

export type VehicleLoadingPackageInput = {
  packageId: string
  profileId?: string
  name: string
  unitWeightKg: number
  dimension: PackageDimension
}

export type VehicleRecommendation = {
  vehicle: VehicleSpec
  packageDimension: PackageDimension
  vehiclesNeeded: number
  loadRateVolume: number
  loadRateWeight: number
  reason: string
  warning?: string
  selectedOrientation: VehicleLoadingOrientation
  boxesPerLayer?: number
  layerCount?: number
  maxBoxesPerVehicle?: number
}
