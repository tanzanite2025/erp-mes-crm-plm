import type { VehicleLoadingPreviewScene } from '../data/vehicle-loading-preview-scene.types'
import { useVehicleLoadingPreviewControls } from '../hooks/use-vehicle-loading-preview-controls'
import { buildVehicleLoadingLayerLayout } from '../services/vehicle-loading-layer-layout'
import { VehicleLoadingPreviewDetailsPanel } from './vehicle-loading-preview-details-panel'
import { VehicleLoadingPreviewRenderer } from './vehicle-loading-preview-renderer'

type Props = {
  scene: VehicleLoadingPreviewScene
}

export function VehicleLoadingPreviewWorkspace({ scene }: Props) {
  const {
    layerCount,
    activeLayerIndex,
    activeLayer,
    boxesInActiveLayer,
    zoomPercent,
    setActiveLayerIndex,
    setZoomPercent,
  } = useVehicleLoadingPreviewControls({ scene })
  const activeLayerLayout = buildVehicleLoadingLayerLayout({
    boxesPerLayer: boxesInActiveLayer,
    vehicleSize: scene.vehicle.size,
    packageSize: scene.packageBox.size,
    orientation: scene.placement.orientation,
    placements: activeLayer?.placements,
  })

  return (
    <div className='grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_440px]'>
      <div className='flex h-full min-h-0 flex-col'>
        <VehicleLoadingPreviewRenderer
          scene={scene}
          layerCount={layerCount}
          activeLayerIndex={activeLayerIndex}
          boxesInActiveLayer={boxesInActiveLayer}
          zoomPercent={zoomPercent}
          onActiveLayerIndexChange={setActiveLayerIndex}
          onZoomPercentChange={setZoomPercent}
        />
      </div>

      <VehicleLoadingPreviewDetailsPanel
        scene={scene}
        activeLayer={activeLayer}
        activeLayerIndex={activeLayerIndex}
        layerCount={layerCount}
        zoomPercent={zoomPercent}
        activeLayerLayout={activeLayerLayout}
      />
    </div>
  )
}
