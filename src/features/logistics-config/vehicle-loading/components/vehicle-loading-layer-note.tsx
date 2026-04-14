export function VehicleLoadingLayerNote({ layerCount, maxBoxes }: { layerCount: number; maxBoxes: number }) {
  if (layerCount <= 1) return null

  return (
    <div className='mt-2 rounded-[12px] border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800'>
      当前方案各层摆放方式一致，仅展示第一层示意。
    </div>
  )
}
