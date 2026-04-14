import { VehicleLoadingLayerStack } from './vehicle-loading-layer-stack'
import { VehicleLoadingLayerNote } from './vehicle-loading-layer-note'
import { VehicleLoadingSummaryStrip } from './vehicle-loading-summary-strip'
import type { VehicleLoadingDiagramProps } from './vehicle-loading-diagram-types'

export function VehicleLoadingLayerView({
  boxesPerLayer,
  orientationLabel,
  orientationAxis,
  layerCount,
  maxBoxes,
}: Pick<VehicleLoadingDiagramProps, 'boxesPerLayer' | 'orientationLabel' | 'orientationAxis' | 'layerCount' | 'maxBoxes'>) {
  return (
    <div className='relative flex min-h-0 flex-1 flex-col'>
      <VehicleLoadingLayerStack
        boxesPerLayer={boxesPerLayer}
        orientationLabel={orientationLabel}
        orientationAxis={orientationAxis}
        layerCount={layerCount}
      />
      <VehicleLoadingLayerNote layerCount={layerCount} maxBoxes={maxBoxes} />
      <VehicleLoadingSummaryStrip boxesPerLayer={boxesPerLayer} layerCount={layerCount} maxBoxes={maxBoxes} />
    </div>
  )
}
