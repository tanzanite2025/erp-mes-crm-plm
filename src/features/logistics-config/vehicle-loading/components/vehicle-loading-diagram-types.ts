import type { CSSProperties } from 'react'
import type {
  VehicleLoadingPreviewPlacedBox,
  VehicleLoadingPreviewSize,
} from '../data/vehicle-loading-preview-scene.types'
import type { VehicleLoadingOrientation } from '../data/vehicle-loading.types'

export type VehicleSize = VehicleLoadingPreviewSize

export type VehicleLoadingDiagramProps = {
  vehicleName: string
  vehicleSize: VehicleSize
  packageSize: VehicleSize
  orientation: VehicleLoadingOrientation
  boxesPerLayer: number
  layerCount: number
  maxBoxes: number
  placements?: VehicleLoadingPreviewPlacedBox[]
  activeLayerIndex?: number
  zoomPercent?: number
  className?: string
}

export type BoxCellProps = {
  index: number
  total: number
  orientation: VehicleLoadingOrientation
  className?: string
  style?: CSSProperties
  fitToContainer?: boolean
}
