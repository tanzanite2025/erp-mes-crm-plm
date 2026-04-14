import { VehicleLoadingBoxCell } from './vehicle-loading-box-cell'
import type { VehicleLoadingDiagramProps } from './vehicle-loading-diagram-types'

function getGridDimensions(totalBoxes: number) {
  if (totalBoxes <= 0) return { cols: 1, rows: 1 }
  const cols = Math.max(1, Math.ceil(Math.sqrt(totalBoxes)))
  const rows = Math.max(1, Math.ceil(totalBoxes / cols))
  return { cols, rows }
}

function formatArrangementText(orientationAxis?: VehicleLoadingDiagramProps['orientationAxis']) {
  const isHeight = orientationAxis === 'height'
  const isLength = orientationAxis === 'length'
  const isWidth = orientationAxis === 'width'
  return isHeight ? '长边竖放' : isLength ? '长边朝车头方向' : isWidth ? '长边朝车厢宽度方向' : '标准朝向'
}

export function VehicleLoadingLayerGrid({
  boxesPerLayer,
  orientationLabel,
  orientationAxis,
}: {
  boxesPerLayer: number
  orientationLabel: string
  orientationAxis?: VehicleLoadingDiagramProps['orientationAxis']
}) {
  const { cols, rows } = getGridDimensions(boxesPerLayer)
  const arrangementText = formatArrangementText(orientationAxis)

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='mb-2 rounded-xl border border-dashed border-primary/20 bg-white/80 px-3 py-2 text-[11px] font-black text-primary/80'>
        {arrangementText} · 每层横向 {cols} 个 · 共 {rows} 行
      </div>

      <div className='grid flex-1 gap-1' style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: Math.max(boxesPerLayer, 1) }, (_, index) => (
          <VehicleLoadingBoxCell
            key={index}
            index={index}
            total={boxesPerLayer}
            orientationLabel={orientationLabel}
            orientationAxis={orientationAxis}
          />
        ))}
        {Array.from({ length: Math.max(cols * rows - boxesPerLayer, 0) }, (_, index) => (
          <div key={`empty-${index}`} className='min-h-14 rounded-md border border-dashed border-border/30 bg-transparent' />
        ))}
      </div>
    </div>
  )
}
