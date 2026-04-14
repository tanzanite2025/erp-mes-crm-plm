export type VehicleCategory = 'van' | 'boxTruck' | 'lightTruck' | 'mediumTruck'

export type VehicleSpec = {
  id: string
  category: VehicleCategory
  name: string
  payloadKg: number
  volumeM3: number
  innerLengthMm: number
  innerWidthMm: number
  innerHeightMm: number
  isBoxBody: boolean
}

export type ShipmentSummary = {
  boxes: number
  totalVolumeM3: number
  totalWeightKg: number
}

export type VehicleRecommendation = {
  vehicle: VehicleSpec
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
