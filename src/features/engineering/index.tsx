'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    Box,
    Plus,
} from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'
import { type Product, type ProductType } from './data/schema'
import { ProductActionDialog } from './components/product-action-dialog'
import { ProductOverviewTab } from './components/product-overview-tab'
import { ProductRoutingView } from './components/product/product-routing-view'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { productService } from './services/product-service'
import { EngineeringSidebar } from './components/engineering-sidebar'
import { CategoryManagerDialog } from './components/category-manager-dialog'
import { dictionaryService } from '@/features/basic-settings/services/dictionary-service'
import { isForbiddenError } from '@/lib/error-status'

type DictionaryEntry = ReturnType<typeof dictionaryService.getEntries>[number]

export function Engineering() {
    const { t } = useLanguage()
    // 基础数据状态
    const [products, setProducts] = useState<Product[]>([])
    const [types, setTypes] = useState<ProductType[]>([])
    const [dictEntries, setDictEntries] = useState<DictionaryEntry[]>([])
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
    // 弹窗控制
    const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
    const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<unknown>(null)

    const refreshProducts = useCallback(async () => {
        const prds = await productService.getProducts()
        const nextProducts = prds || []
        setProducts(nextProducts)
        setSelectedProductId(prev => {
            if (nextProducts.length === 0) return null
            if (prev && nextProducts.some((p: Product) => p.id === prev)) return prev
            return nextProducts[0].id
        })
    }, [])

    const refreshTypes = useCallback(async () => {
        const typs = await productService.getProductTypes()
        setTypes(typs || [])
    }, [])

    const refreshDicts = useCallback(async () => {
        await dictionaryService.init()
        setDictEntries(dictionaryService.getEntries())
    }, [])

    const loadAllData = useCallback(async () => {
        setIsLoading(true)
        try {
            setError(null)
            await dictionaryService.init()
            const [prds, typs] = await Promise.all([
                productService.getProducts(),
                productService.getProductTypes()
            ])

            const nextProducts = prds || []
            setProducts(nextProducts)
            setTypes(typs || [])
            setDictEntries(dictionaryService.getEntries())

            setSelectedProductId(prev => {
                if (nextProducts.length === 0) return null
                if (prev && nextProducts.some((p: Product) => p.id === prev)) return prev
                return nextProducts[0].id
            })
        } catch (loadError) {
            setError(loadError)
        } finally {
            setIsLoading(false)
        }
    }, [])

    // 加载数据 (对接后端服务)
    useEffect(() => {
        const timer = globalThis.setTimeout(() => {
            void loadAllData()
        }, 0)

        window.addEventListener('xdfc_products_data_updated', refreshProducts)
        window.addEventListener('xdfc_product_types_data_updated', refreshTypes)
        window.addEventListener('xdfc_dictionary_updated', refreshDicts)
        return () => {
            globalThis.clearTimeout(timer)
            window.removeEventListener('xdfc_products_data_updated', refreshProducts)
            window.removeEventListener('xdfc_product_types_data_updated', refreshTypes)
            window.removeEventListener('xdfc_dictionary_updated', refreshDicts)
        }
    }, [loadAllData, refreshDicts, refreshProducts, refreshTypes])

    const selectedProduct = products.find(p => p.id === selectedProductId)

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    const handleAddProduct = () => {
        setEditingProduct(undefined)
        setIsProductDialogOpen(true)
    }

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product)
        setIsProductDialogOpen(true)
    }

    const handleProductSubmit = async (data: Product | Product[]) => {
        const incoming = Array.isArray(data) ? data : [data]
        
        for (const item of incoming) {
            await productService.saveProduct(item)
        }

        window.dispatchEvent(new CustomEvent('xdfc_products_data_updated'))
        
        if (!editingProduct && incoming.length > 0) {
             setSelectedProductId(incoming[0].id)
        }
        setIsProductDialogOpen(false)
    }

    return (
        <div className='flex flex-col gap-4 sm:gap-8 px-4 pb-6 pt-0 md:px-6 animate-in fade-in duration-700'>
            {/* 标准页眉：UDS 1.0 */}
            <PageHeader
                icon={Box}
                title={t('engineering.productMgmt.pageTitle')}
                description={t('engineering.productMgmt.pageDescription')}
            />

            <div className='flex flex-col lg:flex-row flex-1 overflow-hidden min-h-[600px] rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-1 gap-1'>
                {/* 1. 侧边导航与型号列表 (Sidebar) */}
                <EngineeringSidebar
                    products={products}
                    types={types}
                    dictEntries={dictEntries}
                    selectedProductId={selectedProductId}
                    onSelectProduct={setSelectedProductId}
                    onAddProduct={handleAddProduct}
                    onEditProduct={handleEditProduct}
                    onAddType={() => setIsTypeDialogOpen(true)}
                />

                {/* 2. 详情层 (Detail) - 内部内容区域 */}
                <div className='p-0 flex-1 overflow-hidden relative bg-background rounded-[24px] lg:rounded-l-none lg:rounded-r-[32px] flex flex-col'>
                {isLoading ? (
                    <div className='flex-1 h-full flex flex-col items-center justify-center text-muted-foreground bg-background animate-pulse'>
                         <div className='relative'>
                            <div className='absolute inset-0 bg-blue-600/20 blur-2xl rounded-full' />
                            <Box className='size-20 opacity-10 mb-6 relative z-10' />
                         </div>
                         <span className='text-[10px] font-black tracking-widest uppercase opacity-30'>{t('engineering.productMgmt.syncing')}</span>
                    </div>
                ) : selectedProduct ? (
                    <div className='p-4 sm:p-8 mx-auto w-full overflow-y-auto'>
                        <Tabs defaultValue='overview' className='w-full'>
                            <div className='flex justify-between items-center mb-6 pl-2'>
                                <TabsList className='bg-muted/10 p-1 rounded-full border border-dashed'>
                                    <TabsTrigger value='overview' className='rounded-full text-[10px] font-black tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'>
                                        {t('engineering.productMgmt.overviewTab')}
                                    </TabsTrigger>
                                    <TabsTrigger value='routing' className='rounded-full text-[10px] font-black tracking-widest uppercase data-[state=active]:bg-purple-600 data-[state=active]:text-white'>
                                        {t('engineering.productMgmt.routingTab')}
                                    </TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value='overview' className='mt-0'>
                                <ProductOverviewTab
                                    product={selectedProduct as Product}
                                    onEdit={handleEditProduct}
                                />
                            </TabsContent>
                            <TabsContent value='routing' className='mt-0'>
                                <ProductRoutingView product={selectedProduct as Product} />
                            </TabsContent>
                        </Tabs>
                    </div>
                ) : (
                    <div className='flex-1 h-full p-4 flex items-center justify-center bg-background rounded-r-[32px]'>
                        <div className='w-full h-full rounded-[24px] border-2 border-dashed border-muted/30 bg-muted/5 flex flex-col items-center justify-center text-center p-6 relative overflow-hidden'>
                            <div className='absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-blue-600/10 to-transparent' />
                            <div className='relative mb-4'>
                                <div className='absolute inset-0 bg-blue-600/5 blur-2xl rounded-full' />
                                <Box className='size-20 opacity-5 relative z-10' />
                                <Plus className='absolute -top-2 -right-2 size-8 text-blue-600/20 animate-pulse' />
                            </div>
                             <h2 className='text-xl font-black text-slate-800 uppercase tracking-tighter italic'>
                                {t('engineering.productMgmt.selectPrompt')}
                            </h2>
                            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mt-3 max-w-sm leading-loose'>
                                {t('engineering.productMgmt.initiateProject')}
                            </p>
                            <Button className='mt-6 h-auto py-2.5 px-8 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-0.5' onClick={handleAddProduct}>
                                <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-90'>
                                    <Plus className='size-3.5' /> {t('engineering.productMgmt.initializeNewProject')}
                                </div>
                            </Button>
                        </div>
                    </div>
                )}
                </div>
            </div>

            {/* 弹窗组件 */}
            <ProductActionDialog
                open={isProductDialogOpen}
                onOpenChange={setIsProductDialogOpen}
                currentRow={editingProduct}
                onSubmit={handleProductSubmit}
                productTypes={types}
            />

            <CategoryManagerDialog 
                open={isTypeDialogOpen}
                onOpenChange={setIsTypeDialogOpen}
            />
        </div>
    )
}
