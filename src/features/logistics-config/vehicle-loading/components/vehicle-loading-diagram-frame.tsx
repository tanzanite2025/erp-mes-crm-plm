import type { VehicleLoadingDiagramProps } from './vehicle-loading-diagram-types'
import { VehicleLoadingLayerView } from './vehicle-loading-layer-view'

function formatSize(size: {
  lengthMm: number
  widthMm: number
  heightMm: number
}) {
  return `${size.lengthMm} × ${size.widthMm} × ${size.heightMm} mm`
}

export function VehicleLoadingDiagramFrame({
  vehicleSize,
  packageSize,
  orientationLabel,
  orientationAxis,
  boxesPerLayer,
  layerCount,
  maxBoxes,
}: Pick<
  VehicleLoadingDiagramProps,
  | 'vehicleSize'
  | 'packageSize'
  | 'orientationLabel'
  | 'orientationAxis'
  | 'boxesPerLayer'
  | 'layerCount'
  | 'maxBoxes'
>) {
  return (
    <div className='flex min-h-0 flex-1 flex-col rounded-[12px] border border-dashed border-border/40 bg-white/70 p-2'>
      <div className='mb-1 flex items-center justify-between text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
        <span>L</span>
        <span>W</span>
      </div>

      <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-primary/15 bg-background/80 p-2'>
        <div className='mb-1 flex items-center justify-between text-[10px] font-black text-primary/55'>
          <span>车厢长 {vehicleSize.lengthMm}mm</span>
          <span>车厢宽 {vehicleSize.widthMm}mm</span>
        </div>

        <div className='min-h-0 flex-1 overflow-hidden'>
          <VehicleLoadingLayerView
            boxesPerLayer={boxesPerLayer}
            orientationLabel={orientationLabel}
            orientationAxis={orientationAxis}
            layerCount={layerCount}
            maxBoxes={maxBoxes}
          />
        </div>

        <div className='mt-1 text-[11px] leading-relaxed text-muted-foreground'>
          车厢尺寸 {formatSize(vehicleSize)}；箱体尺寸 {formatSize(packageSize)}
          。
        </div>
      </div>
    </div>
  )
}
