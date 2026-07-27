export function VehicleLoadingLayerNote({
  activeLayerIndex,
  layerCount,
}: {
  activeLayerIndex: number
  layerCount: number
}) {
  if (layerCount <= 1) return null

  return (
    <div className='mt-2 rounded-[12px] border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800'>
      当前查看第 {activeLayerIndex + 1} 层；现阶段各层摆放方式一致，后续 3D
      预览会承接逐层差异与碰撞检测。
    </div>
  )
}
