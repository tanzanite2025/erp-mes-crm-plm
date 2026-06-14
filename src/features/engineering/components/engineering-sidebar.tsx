'use client'

import { type TranslationKey } from '@/locales'
import { Search, Plus, Box, Settings2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type ProductOwnerEntry } from '@/features/product-structure/hooks/use-product-owners-map'
import { type Product, type ProductType } from '../data/schema'
import { type EngineeringProductDisplayMetadata } from '../hooks/use-engineering-product-display-metadata'
import { useEngineeringSidebarViewModel } from '../hooks/use-engineering-sidebar-view-model'

type EngineeringSidebarProps = {
  products: Product[]
  types: ProductType[]
  productDisplayMetadataMap: Map<string, EngineeringProductDisplayMetadata>
  productOwnersMap?: Map<string, ProductOwnerEntry[]>
  selectedProductId: string | null
  onSelectProduct: (id: string) => void
  onAddProduct: () => void
  onEditProduct: (product: Product) => void
  onAddType: () => void
}

export function EngineeringSidebar({
  products,
  types,
  productDisplayMetadataMap,
  productOwnersMap: _productOwnersMap,
  selectedProductId,
  onSelectProduct,
  onAddProduct,
  onEditProduct,
  onAddType,
}: EngineeringSidebarProps) {
  const { t } = useLanguage()
  const templateSummaryUnavailableKey =
    'engineering.productMgmt.templateSummaryUnavailable' as TranslationKey
  const vm = useEngineeringSidebarViewModel({ products, types })

  return (
    <div className='flex w-full flex-col bg-card lg:w-1/2 lg:basis-1/2'>
      {/* 列表头部：搜索与主控 (Standardized for UDS 1.0 Sidebar Context) */}
      <div className='space-y-3 p-3 sm:p-4'>
        <div className='flex flex-col items-stretch gap-2 rounded-[20px] border border-dashed border-muted/50 bg-muted/20 p-2.5 sm:flex-row sm:items-center sm:p-3'>
          <div className='group relative flex-1'>
            <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-blue-600' />
            <Input
              placeholder={t(
                'engineering.productMgmt.sidebar.searchPlaceholder'
              )}
              className='h-11 rounded-full border-none bg-white/50 pl-9 text-xs font-bold tracking-tight uppercase shadow-inner placeholder:text-muted-foreground/30 focus-visible:ring-2 focus-visible:ring-blue-600/20'
              value={vm.searchTerm}
              onChange={(e) => vm.handleSearchTermChange(e.target.value)}
            />
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              className='flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-muted-foreground/10 bg-white px-4 text-[9px] font-black tracking-widest whitespace-nowrap text-muted-foreground uppercase transition-all hover:bg-muted/40 hover:text-blue-600'
              onClick={onAddType}
            >
              <Settings2 className='size-4' />
              <span>{t('engineering.productMgmt.sidebar.editCategory')}</span>
            </Button>
            <Button
              className='h-11 flex-1 gap-2 rounded-full bg-blue-600 px-5 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-blue-600/20 transition-all hover:scale-105 hover:bg-blue-700 active:scale-95 sm:flex-none'
              onClick={onAddProduct}
            >
              <Plus className='size-4' />
              <span className='whitespace-nowrap'>
                {t('engineering.productMgmt.sidebar.addProduct')}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* 垂直品类分组展示区 */}
      <ScrollArea className='flex-1 border-t'>
        <div className='min-h-full space-y-3 bg-muted/5 px-3 py-3 sm:px-4'>
          {vm.typeSections.map(({ type, products: typeProducts }) => {
            if (typeProducts.length === 0 && vm.searchTerm) return null

            return (
              <div
                key={type.id}
                className='group/row relative space-y-1.5'
                style={{
                  paddingLeft: `calc(${type.level} * clamp(8px, 4vw, 24px))`,
                }}
              >
                {/* 层级连接引导线 */}
                {type.level > 0 && (
                  <div className='absolute top-3 bottom-0 left-0 -ml-3 w-px bg-blue-600/10' />
                )}

                {/* 品类抬头 */}
                <div className='flex items-center gap-3 px-1'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={`size-1.5 rounded-full ${type.level === 0 ? 'bg-blue-600' : 'bg-blue-600/40'}`}
                    />
                    <h3
                      className={`font-black tracking-widest uppercase italic ${type.level === 0 ? 'text-[11px] text-slate-800' : 'text-[9px] text-muted-foreground/40'}`}
                    >
                      {type.name}
                    </h3>
                  </div>
                  <div className='h-px flex-1 border-t border-dashed bg-muted-foreground/10' />
                  <span className='xs:block hidden font-mono text-[8px] font-black tracking-widest text-muted-foreground/30'>
                    {t('engineering.productMgmt.sidebar.totalProducts', {
                      count: typeProducts.length,
                    })}
                  </span>
                </div>

                {/* 型号垂直双列列表 */}
                <div className='flex flex-col gap-1 pl-3'>
                  {typeProducts.length > 0
                    ? typeProducts.map((product) => {
                        const productDisplayMetadata =
                          productDisplayMetadataMap.get(product.id) || null
                        const isSelected = selectedProductId === product.id

                        return (
                          <div
                            key={product.id}
                            className={`xs:grid-cols-[68px_1fr] xs:gap-3 grid cursor-pointer grid-cols-[56px_1fr] items-center gap-2.5 rounded-[18px] border-2 border-dashed p-2 transition-all sm:grid-cols-[80px_1fr] sm:gap-3 sm:p-2.5 ${
                              isSelected
                                ? 'scale-[1.02] transform border-blue-500/50 bg-blue-600 text-white shadow-xl shadow-blue-600/30'
                                : 'border-muted/50 bg-muted/5 hover:border-muted-foreground/20 hover:bg-muted/10'
                            }`}
                            onClick={() => onSelectProduct(product.id)}
                          >
                            {/* 第 1 列：图片预览对齐 */}
                            <div className='flex justify-center'>
                              <div
                                className={`xs:size-14 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition-all sm:size-16 ${isSelected ? 'bg-white/20 shadow-inner' : 'border border-muted/20 bg-background shadow-sm'}`}
                              >
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt=''
                                    className='size-full object-cover'
                                  />
                                ) : (
                                  <Box
                                    className={`xs:size-6 size-5 opacity-30 sm:size-8 ${isSelected ? 'text-white' : 'text-muted-foreground'}`}
                                  />
                                )}
                              </div>
                            </div>

                            {/* 第 2 列：信息集中对齐 */}
                            <div className='group/card-info relative flex min-w-0 flex-col gap-0.5'>
                              <div className='flex items-center justify-between gap-2.5'>
                                <p className='truncate text-[13px] leading-none font-black tracking-tight uppercase italic sm:text-[15px]'>
                                  {product.name}
                                </p>
                                <div className='flex shrink-0 items-center gap-2'>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className={`size-7 rounded-xl transition-all ${
                                      isSelected
                                        ? 'text-white/40 hover:bg-white/10 hover:text-white'
                                        : 'text-muted-foreground/40 hover:bg-blue-600/10 hover:text-blue-600'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onEditProduct(product)
                                    }}
                                  >
                                    <Settings2 className='size-4' />
                                  </Button>
                                </div>
                              </div>

                              {/* 标题之外的剩余聚合信息 */}
                              {productDisplayMetadata
                                ?.aggregateSupplementalItems.length ? (
                                <div className='flex flex-wrap gap-1'>
                                  {productDisplayMetadata.aggregateSupplementalItems.map(
                                    (item) => (
                                      <div
                                        key={item.key}
                                        className={`rounded-lg border px-2 py-0.5 text-[9px] leading-4 font-black tracking-tight ${
                                          isSelected
                                            ? 'border-white/10 bg-white/15 text-white'
                                            : item.empty
                                              ? 'border-amber-500/20 bg-amber-500/5 text-amber-700'
                                              : 'border-emerald-600/10 bg-emerald-600/5 text-slate-700'
                                        }`}
                                      >
                                        <span
                                          className={`mr-0.5 ${isSelected ? 'text-white/50' : 'text-muted-foreground/50'}`}
                                        >
                                          {item.label}:
                                        </span>
                                        <span>{item.value}</span>
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <div
                                  className={`inline-flex w-fit rounded-lg border border-dashed px-2 py-0.5 text-[9px] leading-4 font-black tracking-tight ${isSelected ? 'border-white/15 bg-white/10 text-white/80' : 'border-slate-300 bg-slate-50 text-slate-500'}`}
                                >
                                  {t('engineering.productMgmt.noBinding')}
                                </div>
                              )}

                              {/* 规格透出 */}
                              {productDisplayMetadata?.resolvedTemplate ? (
                                productDisplayMetadata.dynamicSummaryItems
                                  .length > 0 ? (
                                  <div className='flex flex-wrap gap-1'>
                                    {productDisplayMetadata.dynamicSummaryItems.map(
                                      (item) => (
                                        <div
                                          key={item.key}
                                          className={`rounded-lg border px-2 py-0.5 text-[9px] leading-4 font-black tracking-tight ${
                                            isSelected
                                              ? 'border-white/10 bg-white/15 text-white'
                                              : item.empty
                                                ? 'border-amber-500/20 bg-amber-500/5 text-amber-700'
                                                : 'border-blue-600/10 bg-blue-600/5 text-slate-700'
                                          }`}
                                        >
                                          <span
                                            className={`mr-0.5 ${isSelected ? 'text-white/50' : 'text-muted-foreground/50'}`}
                                          >
                                            {item.label}:
                                          </span>
                                          <span>{item.value}</span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                ) : null
                              ) : (
                                <div
                                  className={`inline-flex w-fit rounded-lg border border-dashed px-2 py-0.5 text-[9px] leading-4 font-black tracking-tight ${isSelected ? 'border-white/15 bg-white/10 text-white/80' : 'border-amber-500/20 bg-amber-500/5 text-amber-700'}`}
                                >
                                  {t(templateSummaryUnavailableKey)}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    : null}
                </div>
              </div>
            )
          })}
          {vm.filteredProducts.length === 0 && (
            <div className='flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-muted/5 py-12 text-muted-foreground'>
              <Search className='size-8 opacity-10' />
              <p className='text-xs font-bold tracking-widest uppercase opacity-30'>
                {t('engineering.db.status.noData')}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
