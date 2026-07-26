import type { VehicleLoadingPreviewPlacedBox } from '../data/vehicle-loading-preview-scene.types'
import {
  buildVehicleLoadingLayerLayout,
  type VehicleLoadingLayerLayout,
} from '../services/vehicle-loading-layer-layout'
import { VehicleLoadingBoxCell } from './vehicle-loading-box-cell'
import type { VehicleLoadingDiagramProps } from './vehicle-loading-diagram-types'

function getBoxPositionStyle(layout: VehicleLoadingLayerLayout, index: number) {
  const columnIndex = index % layout.columnsAlongLength
  const rowIndex = Math.floor(index / layout.columnsAlongLength)
  const widthPercent =
    (layout.boxFootprintLengthMm / layout.vehicleLengthMm) * 100
  const heightPercent =
    (layout.boxFootprintWidthMm / layout.vehicleWidthMm) * 100

  return {
    left: `${columnIndex * widthPercent}%`,
    top: `${rowIndex * heightPercent}%`,
    width: `${widthPercent}%`,
    height: `${heightPercent}%`,
  }
}

function toPlacementPercent(valueMm: number, containerMm: number) {
  if (
    !Number.isFinite(valueMm) ||
    !Number.isFinite(containerMm) ||
    containerMm <= 0
  ) {
    return 0
  }
  return (valueMm / containerMm) * 100
}

function getExactPlacementBoxPositionStyle({
  placement,
  vehicleLengthMm,
  vehicleWidthMm,
}: {
  placement: VehicleLoadingPreviewPlacedBox
  vehicleLengthMm: number
  vehicleWidthMm: number
}) {
  return {
    left: `${toPlacementPercent(placement.positionMm.xMm, vehicleLengthMm)}%`,
    top: `${toPlacementPercent(placement.positionMm.yMm, vehicleWidthMm)}%`,
    width: `${toPlacementPercent(placement.dimension.lengthMm, vehicleLengthMm)}%`,
    height: `${toPlacementPercent(placement.dimension.widthMm, vehicleWidthMm)}%`,
  }
}

export function VehicleLoadingLayerGrid({
  vehicleSize,
  packageSize,
  boxesPerLayer,
  orientation,
  placements,
}: {
  vehicleSize: VehicleLoadingDiagramProps['vehicleSize']
  packageSize: VehicleLoadingDiagramProps['packageSize']
  boxesPerLayer: number
  orientation: VehicleLoadingDiagramProps['orientation']
  placements?: VehicleLoadingDiagramProps['placements']
}) {
  const exactPlacements =
    placements && placements.length > 0 ? placements : undefined
  const layout = buildVehicleLoadingLayerLayout({
    boxesPerLayer,
    vehicleSize,
    packageSize,
    orientation,
    placements: exactPlacements,
  })
  const boxCount = Math.max(boxesPerLayer, 0)
  const visibleBoxCount = exactPlacements?.length ?? boxCount

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='mb-2 rounded-xl border border-dashed border-primary/20 bg-primary/5 px-3 py-2 text-[11px] font-black text-primary/80'>
        {layout.arrangementText} · 沿长 {layout.columnsAlongLength} 个 · 沿宽{' '}
        {layout.rowsAlongWidth} 行
        {!layout.usesRealDimensions ? ' · 尺寸未完整，使用占位比例' : null}
        {layout.exceedsVehicleFootprint ? ' · 当前层超出车厢脚印' : null}
      </div>

      <div className='flex min-h-[360px] flex-1 items-stretch justify-center overflow-hidden rounded-xl border border-dashed border-border/50 bg-muted/20 p-2'>
        <div className='relative h-full min-h-0 w-full overflow-hidden rounded-xl border border-primary/20 bg-background/80 shadow-inner'>
          <div className='absolute inset-3 flex items-center justify-center rounded-lg border border-dashed border-primary/15 bg-primary/[0.02]'>
            <div
              className='relative w-full max-w-full overflow-hidden rounded-lg border border-primary/20 bg-background/70'
              style={{
                aspectRatio: `${layout.vehicleAspectRatio}`,
                maxHeight: '100%',
              }}
            >
              {exactPlacements
                ? exactPlacements.map((placement) => (
                    <div
                      key={placement.packageIndex}
                      className='absolute p-0.5'
                      style={getExactPlacementBoxPositionStyle({
                        placement,
                        vehicleLengthMm: layout.vehicleLengthMm,
                        vehicleWidthMm: layout.vehicleWidthMm,
                      })}
                    >
                      <VehicleLoadingBoxCell
                        index={placement.packageIndex}
                        total={visibleBoxCount}
                        orientation={orientation}
                        fitToContainer
                        className='overflow-hidden'
                      />
                    </div>
                  ))
                : Array.from({ length: boxCount }, (_, index) => (
                    <div
                      key={index}
                      className='absolute p-0.5'
                      style={getBoxPositionStyle(layout, index)}
                    >
                      <VehicleLoadingBoxCell
                        index={index}
                        total={boxesPerLayer}
                        orientation={orientation}
                        fitToContainer
                        className='overflow-hidden'
                      />
                    </div>
                  ))}
            </div>
          </div>
          {visibleBoxCount === 0 ? (
            <div className='absolute inset-0 flex items-center justify-center text-[11px] font-black text-muted-foreground'>
              当前层暂无箱体
            </div>
          ) : null}
        </div>
      </div>

      <div className='mt-2 grid grid-cols-3 gap-2 text-[10px] font-black text-muted-foreground/80'>
        <div className='rounded-lg border border-dashed border-border/50 bg-background/70 px-2 py-1.5'>
          脚印利用率 {(layout.occupancyRate * 100).toFixed(1)}%
        </div>
        <div className='rounded-lg border border-dashed border-border/50 bg-background/70 px-2 py-1.5'>
          已占 {layout.occupiedSlots} / {layout.totalSlots} 位
        </div>
        <div className='rounded-lg border border-dashed border-border/50 bg-background/70 px-2 py-1.5'>
          当前箱数 {visibleBoxCount} 箱
        </div>
      </div>
    </div>
  )
}
