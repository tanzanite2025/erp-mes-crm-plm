export function VehicleLoadingSummaryStrip({
  boxesPerLayer,
  layerCount,
  maxBoxes,
}: {
  boxesPerLayer: number
  layerCount: number
  maxBoxes: number
}) {
  return (
    <div className='mt-2 flex items-center justify-between text-[10px] font-black text-primary/60'>
      <span>每层 {boxesPerLayer} 箱</span>
      <span>共 {layerCount} 层</span>
      <span>合计 {maxBoxes} 箱</span>
    </div>
  )
}
