export function VehicleLoadingPreviewEmptyState() {
  return (
    <div className='flex h-full min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-dashed border-border/60 bg-background/80 px-6 py-8 text-center'>
      <div className='text-sm font-black tracking-tight text-foreground'>
        请选择一个推荐方案
      </div>
      <div className='mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground'>
        当前没有可视化的装箱方案，先在页面下方生成推荐结果，再打开这里查看装箱预览。
      </div>
    </div>
  )
}
