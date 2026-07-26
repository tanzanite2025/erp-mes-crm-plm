import type { VehicleLoadingDiagramProps } from './vehicle-loading-diagram-types'
import { VehicleLoadingLayerNote } from './vehicle-loading-layer-note'
import { VehicleLoadingLayerStack } from './vehicle-loading-layer-stack'
import { VehicleLoadingSummaryStrip } from './vehicle-loading-summary-strip'

export function VehicleLoadingLayerView({
  vehicleSize,
  packageSize,
  boxesPerLayer,
  orientation,
  layerCount,
  maxBoxes,
  placements,
  activeLayerIndex = 0,
  zoomPercent = 100,
}: Pick<
  VehicleLoadingDiagramProps,
  | 'vehicleSize'
  | 'packageSize'
  | 'boxesPerLayer'
  | 'orientation'
  | 'layerCount'
  | 'maxBoxes'
  | 'placements'
  | 'activeLayerIndex'
  | 'zoomPercent'
>) {
  return (
    <div className='relative flex min-h-0 flex-1 flex-col'>
      <div
        className='flex min-h-0 flex-1 flex-col transition-transform duration-200 ease-out'
        style={{
          transform: `scale(${zoomPercent / 100})`,
          transformOrigin: 'center center',
        }}
      >
        <VehicleLoadingLayerStack
          vehicleSize={vehicleSize}
          packageSize={packageSize}
          boxesPerLayer={boxesPerLayer}
          orientation={orientation}
          layerCount={layerCount}
          placements={placements}
          activeLayerIndex={activeLayerIndex}
        />
      </div>
      <VehicleLoadingLayerNote
        activeLayerIndex={activeLayerIndex}
        layerCount={layerCount}
      />
      <VehicleLoadingSummaryStrip
        boxesPerLayer={boxesPerLayer}
        layerCount={layerCount}
        maxBoxes={maxBoxes}
      />
    </div>
  )
}
