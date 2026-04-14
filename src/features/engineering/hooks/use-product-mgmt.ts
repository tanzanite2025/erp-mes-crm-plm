import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { type TranslationKey } from '@/locales'
import { toast } from 'sonner'
import { ProductCoreService } from '../services/product-core-service'
import { ProductTypeService } from '../services/product-type-service'
import { type Product } from '../data/schema'
import { type ProductSubmitPayload } from './use-product-form'
import { useProductWriteActions } from './use-product-write-actions'
import { PRODUCT_TYPES_QUERY_KEY, PRODUCTS_QUERY_KEY } from '../query-keys'

const logger = createLogger('useProductMgmt')

type TranslateProductArchive = (key: TranslationKey, params?: Record<string, string | number>) => string

export function useProductMgmt(t: TranslateProductArchive) {
    const [activeTab, setActiveTab] = useState<string>('all')
    const [activeSubTab, setActiveSubTab] = useState<string>('all')
    const queryClient = useQueryClient()
    const { saveProducts, syncProducts, deleteProduct } = useProductWriteActions()
    const productsQuery = useQuery({
        queryKey: PRODUCTS_QUERY_KEY,
        queryFn: () => ProductCoreService.getProducts(),
    })
    const productTypesQuery = useQuery({
        queryKey: PRODUCT_TYPES_QUERY_KEY,
        queryFn: () => ProductTypeService.getProductTypes(),
    })
    const data = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
    const productTypes = useMemo(() => productTypesQuery.data ?? [], [productTypesQuery.data])
    const isLoading = productsQuery.isLoading || productsQuery.isFetching || productTypesQuery.isLoading || productTypesQuery.isFetching

    useEffect(() => {
        if (productsQuery.error || productTypesQuery.error) {
            logger.error('Failed to load product archive data', productsQuery.error ?? productTypesQuery.error)
        }
    }, [productTypesQuery.error, productsQuery.error])

    const handleActiveTabChange = (nextTab: string) => {
        setActiveTab(nextTab)
        setActiveSubTab('all')
    }

    const topLevelTypes = useMemo(
        () => productTypes.filter((type) => type && !type.parentId),
        [productTypes]
    )

    const subLevelTypes = useMemo(
        () => productTypes.filter((type) => type && type.parentId === activeTab),
        [activeTab, productTypes]
    )

    const filteredProducts = useMemo(() => {
        return data.filter((product) => {
            const type = productTypes.find((entry) => entry.id === product.typeId)

            if (activeTab !== 'all') {
                if (!type?.id) return false
                const isChildOfCurrentTab = type.parentId === activeTab
                const isCurrentTabDirectly = type.id === activeTab
                if (!isChildOfCurrentTab && !isCurrentTabDirectly) return false
            }

            if (activeSubTab !== 'all' && product.typeId !== activeSubTab) {
                return false
            }

            return true
        })
    }, [activeSubTab, activeTab, data, productTypes])

    const handleFormSubmit = async ({ products, currentRow }: ProductSubmitPayload) => {
        if (products.length > 1) {
            await syncProducts(products)
        } else {
            const [product] = products
            if (!product) return
            await saveProducts([{ data: product, currentRow }])
        }
    }

    const handleDeleteProduct = async (product: Product) => {
        const confirmed = window.confirm(t('engineering.productArchive.toasts.deleteConfirm'))
        if (!confirmed) return

        try {
            await deleteProduct(product.id)
            toast.success(t('engineering.productArchive.toasts.deleteSuccess'))
        } catch (error) {
            const message = error instanceof Error ? error.message : ''
            toast.error(
                t('engineering.productArchive.toasts.deleteFailed', {
                    message,
                })
            )
            logger.error('Failed to delete product archive item', error)
        }
    }

    const refresh = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY }),
            queryClient.invalidateQueries({ queryKey: PRODUCT_TYPES_QUERY_KEY }),
        ])
    }

    return {
        data,
        productTypes,
        isLoading,
        activeTab,
        setActiveTab: handleActiveTabChange,
        activeSubTab,
        setActiveSubTab,
        topLevelTypes,
        subLevelTypes,
        filteredProducts,
        handleFormSubmit,
        handleDeleteProduct,
        refresh,
    }
}
