import type { VehicleSpec } from '../../data/vehicle-loading.types'

export type PackageDimension = {
  lengthMm: number
  widthMm: number
  heightMm: number
  canRotate: boolean
  canInvert: boolean
}

export type PackageLoadProfile = {
  packageId: string
  name: string
  quantity: number
  dimension: PackageDimension
  unitWeightKg: number
}

export type VehicleLoadSpace = Pick<
  VehicleSpec,
  'id' | 'name' | 'usableInnerSize' | 'payloadKg' | 'volumeM3' | 'isBoxBody'
>

export type Orientation = {
  lengthMm: number
  widthMm: number
  heightMm: number
  label: string
}

export type LoadingRuleResult = {
  passed: boolean
  code: string
  message: string
}

export type VehicleLoadPlan = {
  vehicle: VehicleLoadSpace
  vehicleId: string
  vehicleName: string
  feasible: boolean
  selectedOrientation?: Orientation
  boxesPerLayer: number
  layerCount: number
  maxBoxesPerVehicle: number
  volumeUtilization: number
  weightUtilization: number
  loadingReason: string[]
  riskNotes: string[]
}

export type VehicleRecommendationPlan = {
  plans: VehicleLoadPlan[]
  bestPlan?: VehicleLoadPlan
  packageProfile: PackageLoadProfile
  engineVersion: string
  generatedAt: string
  warnings: string[]
}

export type VehicleLoadPlanningInput = {
  packageProfile: PackageLoadProfile
  vehicles: VehicleLoadSpace[]
}
