import { Button } from '@/components/ui/button'
import type { VehicleLoadingPreviewLayer } from '../data/vehicle-loading-preview-scene.types'

const ZOOM_OPTIONS = [75, 100, 125] as const

type Props = {
  layers: VehicleLoadingPreviewLayer[]
  layerCount: number
  activeLayerIndex: number
  zoomPercent: number
  onActiveLayerIndexChange: (layerIndex: number) => void
  onZoomPercentChange: (zoomPercent: number) => void
}

function clampLayerIndex(layerIndex: number, layerCount: number) {
  return Math.min(Math.max(layerIndex, 0), Math.max(layerCount - 1, 0))
}

export function VehicleLoadingPreviewControls({
  layers,
  layerCount,
  activeLayerIndex,
  zoomPercent,
  onActiveLayerIndexChange,
  onZoomPercentChange,
}: Props) {
  const hasMultipleLayers = layerCount > 1
  const currentLayerNumber = activeLayerIndex + 1
  const visibleLayers =
    layers.length > 0
      ? layers
      : [
          {
            layerIndex: 0,
            displayName: '第 1 层',
            boxesInLayer: 0,
            usesRepeatedArrangement: true,
          },
        ]

  return (
    <div className='mb-2 space-y-1.5 rounded-[18px] border border-dashed border-border/60 bg-background/85 px-2.5 py-2'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            层浏览器
          </span>
          <span className='text-xs font-black text-foreground'>
            第 {currentLayerNumber} / {Math.max(layerCount, 1)} 层
          </span>
        </div>

        <div className='flex items-center gap-1'>
          {ZOOM_OPTIONS.map((item) => (
            <Button
              key={item}
              type='button'
              variant={zoomPercent === item ? 'default' : 'outline'}
              size='sm'
              className='h-7 rounded-full px-2.5 text-[10px] font-black'
              onClick={() => onZoomPercentChange(item)}
            >
              {item}%
            </Button>
          ))}
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        {hasMultipleLayers ? (
          <div className='flex shrink-0 items-center gap-1'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-7 rounded-full px-2.5 text-[10px] font-black'
              disabled={activeLayerIndex <= 0}
              onClick={() =>
                onActiveLayerIndexChange(
                  clampLayerIndex(activeLayerIndex - 1, layerCount)
                )
              }
            >
              上一层
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-7 rounded-full px-2.5 text-[10px] font-black'
              disabled={activeLayerIndex >= layerCount - 1}
              onClick={() =>
                onActiveLayerIndexChange(
                  clampLayerIndex(activeLayerIndex + 1, layerCount)
                )
              }
            >
              下一层
            </Button>
          </div>
        ) : null}

        <div className='flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5'>
          {visibleLayers.map((layer) => {
            const isActive = layer.layerIndex === activeLayerIndex
            return (
              <Button
                key={layer.layerIndex}
                type='button'
                variant={isActive ? 'default' : 'outline'}
                size='sm'
                className='h-7 shrink-0 rounded-full px-2.5 text-[10px] font-black'
                onClick={() =>
                  onActiveLayerIndexChange(
                    clampLayerIndex(layer.layerIndex, layerCount)
                  )
                }
              >
                {layer.displayName} · {layer.boxesInLayer} 箱
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
