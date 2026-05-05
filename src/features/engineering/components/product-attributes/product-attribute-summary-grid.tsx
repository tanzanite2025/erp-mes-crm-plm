import { type ProductAttributeCategory } from '../../data/schema'

interface ProductAttributeSummaryItem extends ProductAttributeCategory {
  count: number
}

interface ProductAttributeSummaryGridProps {
  categories: ProductAttributeSummaryItem[]
  selectedCategoryKey: string
  locale: string
  getLocalizedCategoryName: (locale: string, category: ProductAttributeCategory) => string
  onSelectCategory: (categoryKey: string) => void
}

export function ProductAttributeSummaryGrid({
  categories,
  selectedCategoryKey,
  locale,
  getLocalizedCategoryName,
  onSelectCategory,
}: ProductAttributeSummaryGridProps) {
  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
      {categories.map((category) => (
        <button
          key={category.id}
          type='button'
          onClick={() => onSelectCategory(category.key)}
          aria-pressed={selectedCategoryKey === category.key}
          className={`group relative min-h-[112px] overflow-hidden rounded-[24px] border border-dashed px-3.5 py-3 text-left transition-all duration-300 ${selectedCategoryKey === category.key ? 'border-primary/40 bg-background shadow-lg shadow-primary/5' : 'border-muted/50 bg-muted/5 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/80 hover:shadow-md'}`}
        >
          <div className='absolute inset-0 bg-linear-to-br from-primary/3 via-transparent pointer-events-none' />
          <div className='relative text-[9px] font-black uppercase tracking-[0.24em] text-primary/50'>{category.key}</div>
          <div className='relative mt-1 text-[22px] font-black tracking-tighter leading-none text-foreground'>{category.count}</div>
          <div className='relative mt-0.5 text-[13px] font-black tracking-tight text-foreground transition-colors group-hover:text-primary'>
            {getLocalizedCategoryName(locale, category)}
          </div>
          <div className='relative mt-1 text-[9px] leading-tight text-muted-foreground'>
            {category.description}
          </div>
        </button>
      ))}
    </div>
  )
}
