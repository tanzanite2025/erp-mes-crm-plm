import type { VehicleLoadingPreviewScene } from '../data/vehicle-loading-preview-scene.types'
import { VehicleLoadingDiagram } from './vehicle-loading-diagram'

type Props = {
  scene: VehicleLoadingPreviewScene
  layerCount: number
  activeLayerIndex: number
  boxesInActiveLayer: number
  zoomPercent: number
}

export function VehicleLoadingLayer2DPreviewRenderer({
  scene,
  layerCount,
  activeLayerIndex,
  boxesInActiveLayer,
  zoomPercent,
}: Props) {
  return (
    <VehicleLoadingDiagram
      vehicleName={scene.vehicle.name}
      vehicleSize={scene.vehicle.size}
      packageSize={scene.packageBox.size}
      orientation={scene.placement.orientation}
      boxesPerLayer={boxesInActiveLayer}
      layerCount={layerCount}
      maxBoxes={scene.placement.maxBoxes}
      placements={scene.layers[activeLayerIndex]?.placements}
      activeLayerIndex={activeLayerIndex}
      zoomPercent={zoomPercent}
    />
  )
}
