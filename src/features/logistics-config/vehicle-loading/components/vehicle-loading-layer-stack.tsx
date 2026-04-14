import { VehicleLoadingLayerGrid } from './vehicle-loading-layer-grid'
import type { VehicleLoadingDiagramProps } from './vehicle-loading-diagram-types'

export function VehicleLoadingLayerStack({
  boxesPerLayer,
  orientationLabel,
  orientationAxis,
  layerCount,
}: Pick<VehicleLoadingDiagramProps, 'boxesPerLayer' | 'orientationLabel' | 'orientationAxis' | 'layerCount'>) {
  return (
    <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-primary/15 bg-white/65 p-3'>
      <div className='mb-2 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-primary/45'>
        <span>车头 ←</span>
        <span>车尾</span>
      </div>

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] bg-white/80 p-2'>
        <div className='mb-2 flex items-center justify-between text-[10px] font-black text-primary/50'>
          <span>内部空间</span>
          <span>第 1 层示意</span>
        </div>
        <VehicleLoadingLayerGrid
          boxesPerLayer={boxesPerLayer}
          orientationLabel={orientationLabel}
          orientationAxis={orientationAxis}
        />
      </div>

      {layerCount > 1 ? (
        <div className='mt-2 text-[10px] font-black text-primary/50'>
          共 {layerCount} 层，其他层结构一致。
        </div>
      ) : null}
    </div>
  )
}
