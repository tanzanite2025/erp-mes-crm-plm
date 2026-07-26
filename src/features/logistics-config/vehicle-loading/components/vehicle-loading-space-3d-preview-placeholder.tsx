export function VehicleLoadingSpace3DPreviewPlaceholder() {
  return (
    <div className='flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-dashed border-primary/25 bg-primary/5 px-6 py-8 text-center'>
      <div className='text-sm font-black tracking-tight text-primary'>
        3D 装箱预览引擎待接入
      </div>
      <div className='mt-2 max-w-xl text-xs leading-relaxed text-primary/75'>
        后续 Rust / WASM / WebGL 的空间装箱预览会接到此入口，承接旋转查看、透明车厢、轮包占位与碰撞检测；当前业务仍使用 2D
        层示意，不写入真实发货。
      </div>
    </div>
  )
}
