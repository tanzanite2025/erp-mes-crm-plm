import { Settings2 } from 'lucide-react'

interface ProductAttributesHeaderProps {
  locale: string
}

export function ProductAttributesHeader({ locale }: ProductAttributesHeaderProps) {
  const isZh = locale === 'zh-CN'

  return (
    <div className='relative overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-5 sm:p-7'>
      <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />
      <div className='relative flex items-center gap-3 text-primary'>
        <div className='flex size-9 items-center justify-center rounded-2xl border border-primary/15 bg-background/80 shadow-sm'>
          <Settings2 className='size-4 text-primary' />
        </div>
        <h3 className='text-base font-black uppercase tracking-tight italic md:text-xl'>
          {isZh ? '产品属性配置' : 'Product Attributes'}
        </h3>
      </div>
      <p className='relative mt-3 text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground/55 md:text-[10px]'>
        {isZh
          ? '维护产品属性分类与分类项，界面展示使用你配置的中英文名称。'
          : 'Manage product attribute categories and options with localized display names.'}
      </p>
    </div>
  )
}
