'use client'

import { Search, Plus, Box, Settings2 } from 'lucide-react'
import { type TranslationKey } from '@/locales'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLanguage } from '@/context/language-provider'
import { type Product, type ProductType } from '../data/schema'
import { type EngineeringProductDisplayMetadata } from '../hooks/use-engineering-product-display-metadata'
import { useEngineeringSidebarViewModel } from '../hooks/use-engineering-sidebar-view-model'
import { resolveProductOwnerDisplay } from '../utils/product-owner-display'

type EngineeringSidebarProps = {
    products: Product[]
    types: ProductType[]
    productDisplayMetadataMap: Map<string, EngineeringProductDisplayMetadata>
    customerNameMap?: Map<string, string>
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
    customerNameMap,
    selectedProductId,
    onSelectProduct,
    onAddProduct,
    onEditProduct,
    onAddType
}: EngineeringSidebarProps) {
    const { t } = useLanguage()
    const templateSummaryUnavailableKey = 'engineering.productMgmt.templateSummaryUnavailable' as TranslationKey
    const vm = useEngineeringSidebarViewModel({ products, types })

    return (
        <div className='w-full lg:basis-1/2 lg:w-1/2 bg-card flex flex-col'>
            {/* 列表头部：搜索与主控 (Standardized for UDS 1.0 Sidebar Context) */}
            <div className='p-3 sm:p-4 space-y-3'>
                <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-muted/20 p-2.5 sm:p-3 rounded-[20px] border border-dashed border-muted/50'>
                    <div className='relative flex-1 group'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-blue-600 transition-colors pointer-events-none' />
                        <Input
                            placeholder={t('engineering.productMgmt.sidebar.searchPlaceholder')}
                            className='pl-9 h-11 bg-white/50 border-none rounded-full focus-visible:ring-2 focus-visible:ring-blue-600/20 text-xs font-bold uppercase tracking-tight placeholder:text-muted-foreground/30 shadow-inner'
                            value={vm.searchTerm}
                            onChange={(e) => vm.handleSearchTermChange(e.target.value)}
                        />
                    </div>

                    <div className='flex items-center gap-2'>
                        <Button
                            variant='outline'
                            className='h-11 px-4 rounded-full bg-white hover:bg-muted/40 text-muted-foreground hover:text-blue-600 flex items-center justify-center gap-2 border border-muted-foreground/10 transition-all font-black text-[9px] uppercase tracking-widest shrink-0 whitespace-nowrap'
                            onClick={onAddType}
                        >
                            <Settings2 className='size-4' />
                            <span>{t('engineering.productMgmt.sidebar.editCategory')}</span>
                        </Button>
                        <Button
                            className='h-11 flex-1 sm:flex-none px-5 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 font-black text-[10px] uppercase tracking-widest text-white gap-2 transition-all hover:scale-105 active:scale-95'
                            onClick={onAddProduct}
                        >
                            <Plus className='size-4' />
                            <span className='whitespace-nowrap'>{t('engineering.productMgmt.sidebar.addProduct')}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 垂直品类分组展示区 */}
            <ScrollArea className='flex-1 border-t'>
                <div className='px-3 sm:px-4 bg-muted/5 min-h-full py-3 space-y-3'>
                    {vm.typeSections.map(({ type, products: typeProducts }) => {
                        if (typeProducts.length === 0 && vm.searchTerm) return null

                        return (
                            <div key={type.id} className='space-y-1.5 group/row relative' style={{ paddingLeft: `calc(${type.level} * clamp(8px, 4vw, 24px))` }}>
                                {/* 层级连接引导线 */}
                                {type.level > 0 && (
                                    <div className='absolute left-0 top-3 bottom-0 w-px bg-blue-600/10 -ml-3' />
                                )}

                                {/* 品类抬头 */}
                                <div className='flex items-center gap-3 px-1'>
                                    <div className='flex items-center gap-2'>
                                        <div className={`size-1.5 rounded-full ${type.level === 0 ? 'bg-blue-600' : 'bg-blue-600/40'}`} />
                                        <h3 className={`font-black uppercase tracking-widest italic ${type.level === 0 ? 'text-[11px] text-slate-800' : 'text-[9px] text-muted-foreground/40'}`}>
                                            {type.name}
                                        </h3>
                                    </div>
                                    <div className='flex-1 h-px bg-muted-foreground/10 border-t border-dashed' />
                                    <span className='text-[8px] font-mono text-muted-foreground/30 font-black tracking-widest hidden xs:block'>
                                        {t('engineering.productMgmt.sidebar.totalProducts', { count: typeProducts.length })}
                                    </span>
                                </div>

                                {/* 型号垂直双列列表 */}
                                <div className='flex flex-col gap-1 pl-3'>
                                    {typeProducts.length > 0 ? (
                                        typeProducts.map(product => {
                                            const productDisplayMetadata = productDisplayMetadataMap.get(product.id) || null
                                            const isSelected = selectedProductId === product.id
                                            const ownerDisplay = resolveProductOwnerDisplay(product, {
                                                internalLabel: t('engineering.productMgmt.form.ownerTypeInternal'),
                                                unknownCustomerLabel: t('engineering.productMgmt.form.ownerTypeCustomer'),
                                                customerNameMap,
                                            })
                                            const ownerBadgeClass = isSelected
                                                ? 'h-4 border-white/20 bg-white/15 text-white px-1 text-[9px] font-black uppercase tracking-wide'
                                                : ownerDisplay.ownerType === 'CUSTOMER'
                                                    ? 'h-4 border-amber-200 bg-amber-50 text-amber-700 px-1 text-[9px] font-black uppercase tracking-wide'
                                                    : 'h-4 border-emerald-200 bg-emerald-50 text-emerald-700 px-1 text-[9px] font-black uppercase tracking-wide'

                                            return (
                                                <div
                                                    key={product.id}
                                                    className={`grid grid-cols-[56px_1fr] xs:grid-cols-[68px_1fr] sm:grid-cols-[80px_1fr] items-center gap-2.5 xs:gap-3 sm:gap-3 p-2 sm:p-2.5 rounded-[18px] cursor-pointer transition-all border-2 border-dashed ${isSelected
                                                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 border-blue-500/50 transform scale-[1.02]'
                                                        : 'bg-muted/5 border-muted/50 hover:bg-muted/10 hover:border-muted-foreground/20'
                                                        }`}
                                                    onClick={() => onSelectProduct(product.id)}
                                                >
                                                    {/* 第 1 列：图片预览对齐 */}
                                                    <div className='flex justify-center'>
                                                        <div className={`size-12 xs:size-14 sm:size-16 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-white/20 shadow-inner' : 'bg-background shadow-sm border border-muted/20'}`}>
                                                            {product.image ? (
                                                                <img src={product.image} alt='' className='size-full object-cover' />
                                                            ) : (
                                                                <Box className={`size-5 xs:size-6 sm:size-8 opacity-30 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 第 2 列：信息集中对齐 */}
                                                    <div className='relative flex min-w-0 flex-col gap-0.5 group/card-info'>
                                                        <div className='flex items-center justify-between gap-2.5'>
                                                            <div className='flex min-w-0 items-center gap-1.5'>
                                                                <p className='truncate text-[13px] font-black tracking-tight uppercase leading-none italic sm:text-[15px]'>
                                                                    {product.name}
                                                                </p>
                                                                <Badge
                                                                    variant='outline'
                                                                    className={`shrink-0 ${ownerBadgeClass}`}
                                                                    title={ownerDisplay.label}
                                                                >
                                                                    {ownerDisplay.label}
                                                                </Badge>
                                                            </div>
                                                            <div className='flex items-center gap-2 shrink-0'>
                                                                <Button
                                                                    variant='ghost'
                                                                    size='icon'
                                                                    className={`size-7 rounded-xl transition-all ${isSelected
                                                                        ? 'text-white/40 hover:text-white hover:bg-white/10'
                                                                        : 'text-muted-foreground/40 hover:text-blue-600 hover:bg-blue-600/10'
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

                                                        {/* 规格透出 */}
                                                        {productDisplayMetadata?.resolvedTemplate ? (
                                                            productDisplayMetadata.dynamicSummaryItems.length > 0 ? (
                                                                <div className='flex flex-wrap gap-1'>
                                                                    {productDisplayMetadata.dynamicSummaryItems.map((item) => (
                                                                        <div
                                                                            key={item.key}
                                                                            className={`rounded-lg border px-2 py-0.5 text-[9px] font-black tracking-tight leading-4 ${isSelected
                                                                                ? 'border-white/10 bg-white/15 text-white'
                                                                                : item.empty
                                                                                    ? 'border-amber-500/20 bg-amber-500/5 text-amber-700'
                                                                                    : 'border-blue-600/10 bg-blue-600/5 text-slate-700'
                                                                                }`}
                                                                        >
                                                                            <span className={`mr-0.5 ${isSelected ? 'text-white/50' : 'text-muted-foreground/50'}`}>
                                                                                {item.label}:
                                                                            </span>
                                                                            <span>{item.value}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : null
                                                        ) : (
                                                            <div className={`inline-flex w-fit rounded-lg border border-dashed px-2 py-0.5 text-[9px] font-black tracking-tight leading-4 ${isSelected ? 'border-white/15 bg-white/10 text-white/80' : 'border-amber-500/20 bg-amber-500/5 text-amber-700'}`}>
                                                                {t(templateSummaryUnavailableKey)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : null}
                                </div>
                            </div>
                        )
                    })}
                    {vm.filteredProducts.length === 0 && (
                        <div className='py-12 flex flex-col items-center justify-center text-muted-foreground gap-3 border border-dashed rounded-2xl bg-muted/5'>
                            <Search className='size-8 opacity-10' />
                            <p className='text-xs font-bold opacity-30 tracking-widest uppercase'>{t('engineering.db.status.noData')}</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
