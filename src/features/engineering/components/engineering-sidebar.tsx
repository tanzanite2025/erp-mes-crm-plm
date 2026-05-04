'use client'

import { Search, Plus, Box, Settings2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLanguage } from '@/context/language-provider'
import { type Product, type ProductType } from '../data/schema'
import { useEngineeringSidebarViewModel } from '../hooks/use-engineering-sidebar-view-model'

type EngineeringSidebarProps = {
    products: Product[]
    types: ProductType[]
    selectedProductId: string | null
    onSelectProduct: (id: string) => void
    onAddProduct: () => void
    onEditProduct: (product: Product) => void
    onAddType: () => void
}

export function EngineeringSidebar({
    products,
    types,
    selectedProductId,
    onSelectProduct,
    onAddProduct,
    onEditProduct,
    onAddType
}: EngineeringSidebarProps) {
    const { t } = useLanguage()
    const vm = useEngineeringSidebarViewModel({ products, types })

    return (
        <div className='w-full lg:w-[480px] bg-card flex flex-col'>
            {/* 列表头部：搜索与主控 (Standardized for UDS 1.0 Sidebar Context) */}
            <div className='p-4 sm:p-6 space-y-4'>
                <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-muted/20 p-3 sm:p-4 rounded-[24px] border border-dashed border-muted/50'>
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
                            className='h-11 w-11 sm:w-auto px-0 sm:px-3 rounded-full bg-white hover:bg-muted/40 text-muted-foreground hover:text-blue-600 flex items-center justify-center sm:justify-start gap-2 border border-muted-foreground/10 transition-all font-black text-[9px] uppercase tracking-widest shrink-0'
                            onClick={onAddType}
                        >
                            <Settings2 className='size-4' />
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
                <div className='px-4 sm:px-6 bg-muted/5 min-h-full py-4 space-y-4'>
                    {vm.typeSections.map(({ type, products: typeProducts }) => {
                        if (typeProducts.length === 0 && vm.searchTerm) return null

                        return (
                            <div key={type.id} className='space-y-2 group/row relative' style={{ paddingLeft: `calc(${type.level} * clamp(8px, 4vw, 24px))` }}>
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
                                <div className='flex flex-col gap-1 pl-4'>
                                    {typeProducts.length > 0 ? (
                                        typeProducts.map(product => {
                                            const productView = vm.productViewMap.get(product.id)
                                            if (!productView) return null

                                            return (
                                                <div
                                                    key={product.id}
                                                    className={`grid grid-cols-[64px_1fr] xs:grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] items-center gap-3 xs:gap-4 sm:gap-6 p-3 sm:p-4 rounded-[24px] cursor-pointer transition-all border-2 border-dashed ${selectedProductId === product.id
                                                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 border-blue-500/50 transform scale-[1.02]'
                                                        : 'bg-muted/5 border-muted/50 hover:bg-muted/10 hover:border-muted-foreground/20'
                                                        }`}
                                                    onClick={() => onSelectProduct(product.id)}
                                                >
                                                    {/* 第 1 列：图片预览对齐 */}
                                                    <div className='flex justify-center'>
                                                        <div className={`size-14 xs:size-16 sm:size-20 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center transition-all ${selectedProductId === product.id ? 'bg-white/20 shadow-inner' : 'bg-background shadow-sm border border-muted/20'}`}>
                                                            {product.image ? (
                                                                <img src={product.image} alt='' className='size-full object-cover' />
                                                            ) : (
                                                                <Box className={`size-6 xs:size-8 sm:size-10 opacity-30 ${selectedProductId === product.id ? 'text-white' : 'text-muted-foreground'}`} />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 第 2 列：信息集中对齐 */}
                                                    <div className='flex flex-col gap-1.5 min-w-0 relative group/card-info'>
                                                        <div className='flex items-center justify-between gap-4'>
                                                            <p className='text-sm sm:text-[16px] font-black truncate tracking-tight uppercase leading-none italic'>
                                                                {productView.name}
                                                            </p>
                                                            <div className='flex items-center gap-2 shrink-0'>
                                                                <Button
                                                                    variant='ghost'
                                                                    size='icon'
                                                                    className={`size-8 rounded-xl transition-all ${selectedProductId === product.id
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
                                                        <div className='flex items-center flex-wrap gap-1.5'>
                                                            <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${selectedProductId === product.id ? 'bg-white/20 text-white' : 'bg-blue-600/10 text-blue-600'}`}>
                                                                {t('engineering.productMgmt.specLabel')}: {productView.sizeLabel}
                                                            </div>
                                                            <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${selectedProductId === product.id ? 'bg-white/20 text-white' : 'bg-orange-600/10 text-orange-600'}`}>
                                                                {vm.getDictLabel(productView.brake || '')}
                                                            </div>
                                                            <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${selectedProductId === product.id ? 'bg-white/20 text-white' : 'bg-emerald-600/10 text-emerald-600'}`}>
                                                                {productView.weightUppercase}
                                                            </div>
                                                        </div>
                                                        <div className='flex items-center flex-wrap gap-1 min-h-5'>
                                                            {product.restrictions && product.restrictions.length > 0 ? (
                                                                product.restrictions.map(tag => (
                                                                    <div key={tag} className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase leading-none border-2 border-dashed ${selectedProductId === product.id ? 'bg-red-500/20 text-red-100 border-red-400/20' : 'bg-rose-500/5 text-rose-600 border-rose-500/20 animate-pulse'}`}>
                                                                        {tag}
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase leading-none border border-dashed ${selectedProductId === product.id ? 'bg-white/5 text-white/20 border-white/10' : 'bg-muted/10 text-muted-foreground/30 border-muted/20'}`}>
                                                                    {t('engineering.productMgmt.noConstraints')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <Button
                                            variant='ghost'
                                            className='h-auto min-h-[48px] py-3 w-full justify-start gap-4 bg-muted/20 border border-dashed rounded-xl px-4 sm:px-10 text-[10px] sm:text-xs font-bold text-muted-foreground/40 uppercase tracking-widest hover:text-blue-600 hover:bg-blue-50 transition-colors whitespace-normal text-left'
                                            onClick={onAddProduct}
                                        >
                                            <span className='flex-1'>+ {t('engineering.productMgmt.initiateProject')}</span>
                                        </Button>
                                    )}
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
