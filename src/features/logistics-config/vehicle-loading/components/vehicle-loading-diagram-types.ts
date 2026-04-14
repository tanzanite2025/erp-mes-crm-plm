export type VehicleSize = {
  lengthMm: number
  widthMm: number
  heightMm: number
}

export type VehicleLoadingDiagramProps = {
  vehicleName: string
  vehicleSize: VehicleSize
  packageSize: VehicleSize
  orientationLabel: string
  orientationAxis?: 'length' | 'width' | 'height'
  boxesPerLayer: number
  layerCount: number
  maxBoxes: number
  className?: string
}

export type BoxCellProps = {
  index: number
  total: number
  orientationLabel: string
  orientationAxis?: 'length' | 'width' | 'height'
}
