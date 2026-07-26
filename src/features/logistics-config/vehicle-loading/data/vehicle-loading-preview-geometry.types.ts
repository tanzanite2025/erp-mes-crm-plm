export type VehicleLoadingPreviewAxis = 'length' | 'width' | 'height'

export type VehicleLoadingPreviewSize = {
  lengthMm: number
  widthMm: number
  heightMm: number
}

export type VehicleLoadingPreviewPosition = {
  xMm: number
  yMm: number
  zMm: number
}

export type VehicleLoadingPreviewVehicleAllowance = {
  topClearanceMm: number
  sideClearanceMm: number
  rearClearanceMm: number
}

export type VehicleLoadingPreviewVehicleLoadingConstraint = {
  doorWidthMm: number
  doorHeightMm: number
  wheelArchWidthMm: number
  wheelArchHeightMm: number
  hasCenterPillar: boolean
}
