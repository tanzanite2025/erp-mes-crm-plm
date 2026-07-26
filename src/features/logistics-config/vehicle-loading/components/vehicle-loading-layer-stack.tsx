import type { VehicleLoadingDiagramProps } from './vehicle-loading-diagram-types'
import { VehicleLoadingLayerGrid } from './vehicle-loading-layer-grid'

export function VehicleLoadingLayerStack({
  vehicleSize,
  packageSize,
  boxesPerLayer,
  orientation,
  layerCount,
  placements,
  activeLayerIndex = 0,
}: Pick<
  VehicleLoadingDiagramProps,
  | 'vehicleSize'
  | 'packageSize'
  | 'boxesPerLayer'
  | 'orientation'
  | 'layerCount'
  | 'placements'
  | 'activeLayerIndex'
>) {
  const activeLayerNumber = activeLayerIndex + 1

  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-primary/15 bg-card/70 p-2.5'>
      <div className='mb-2 flex items-center justify-between text-[9px] font-black tracking-widest text-primary/50 uppercase'>
        <span>车头 ←</span>
        <span>车尾</span>
      </div>

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-border/50 bg-background/75 p-2'>
        <div className='mb-2 flex items-center justify-between text-[10px] font-black text-primary/60'>
          <span>内部空间</span>
          <span>第 {activeLayerNumber} 层示意</span>
        </div>
        <VehicleLoadingLayerGrid
          vehicleSize={vehicleSize}
          packageSize={packageSize}
          boxesPerLayer={boxesPerLayer}
          orientation={orientation}
          placements={placements}
        />
      </div>

      {layerCount > 1 ? (
        <div className='mt-2 text-[10px] font-black text-primary/50'>
          共 {layerCount} 层，当前查看第 {activeLayerNumber} 层。
        </div>
      ) : null}
    </div>
  )
}
