import type { VehicleLoadingPreviewScene } from '../data/vehicle-loading-preview-scene.types'
import { VehicleLoadingLayer2DPreviewRenderer } from './vehicle-loading-layer-2d-preview-renderer'
import { VehicleLoadingPreviewControls } from './vehicle-loading-preview-controls'
import { VehicleLoadingPreviewEmptyState } from './vehicle-loading-preview-empty-state'
import { VehicleLoadingSpace3DPreviewPlaceholder } from './vehicle-loading-space-3d-preview-placeholder'

type Props = {
  scene: VehicleLoadingPreviewScene
  layerCount: number
  activeLayerIndex: number
  boxesInActiveLayer: number
  zoomPercent: number
  onActiveLayerIndexChange: (layerIndex: number) => void
  onZoomPercentChange: (zoomPercent: number) => void
}

export function VehicleLoadingPreviewRenderer({
  scene,
  layerCount,
  activeLayerIndex,
  boxesInActiveLayer,
  zoomPercent,
  onActiveLayerIndexChange,
  onZoomPercentChange,
}: Props) {
  if (scene.status === 'empty') {
    return <VehicleLoadingPreviewEmptyState />
  }

  if (scene.status === 'calculating') {
    return (
      <div className='flex h-full min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-primary/30 bg-primary/5 px-5 py-8 text-center'>
        <div className='text-sm font-black text-primary'>
          WASM 装箱计算中...
        </div>
        <div className='mt-2 max-w-md text-[11px] leading-relaxed text-primary/75'>
          正在调用 Rust/WASM 装箱引擎生成真实摆放坐标，完成后会显示当前车辆内的
          placements。
        </div>
      </div>
    )
  }

  if (scene.status === 'failed') {
    return (
      <div className='flex h-full min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-destructive/40 bg-destructive/5 px-5 py-8 text-center'>
        <div className='text-sm font-black text-destructive'>
          WASM 装箱计算失败
        </div>
        <div className='mt-2 max-w-md text-[11px] leading-relaxed text-destructive/80'>
          {scene.errorMessage ?? '未知错误'}
        </div>
      </div>
    )
  }

  switch (scene.renderer) {
    case 'layer-2d':
      return (
        <div className='flex h-full min-h-0 flex-1 flex-col rounded-[24px] border border-primary/10 bg-primary/[0.03] p-2'>
          <VehicleLoadingPreviewControls
            layers={scene.layers}
            layerCount={layerCount}
            activeLayerIndex={activeLayerIndex}
            zoomPercent={zoomPercent}
            onActiveLayerIndexChange={onActiveLayerIndexChange}
            onZoomPercentChange={onZoomPercentChange}
          />
          <VehicleLoadingLayer2DPreviewRenderer
            scene={scene}
            layerCount={layerCount}
            activeLayerIndex={activeLayerIndex}
            boxesInActiveLayer={boxesInActiveLayer}
            zoomPercent={zoomPercent}
          />
        </div>
      )
    case 'space-3d':
      return <VehicleLoadingSpace3DPreviewPlaceholder />
  }

  return (
    <div className='rounded-[28px] border border-dashed border-destructive/40 bg-destructive/5 px-5 py-4 text-xs text-destructive'>
      暂不支持的装箱预览渲染器。
    </div>
  )
}
