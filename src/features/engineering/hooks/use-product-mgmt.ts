import { useState, useEffect, useMemo, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import { ProductCoreService } from '../services/product-core-service'
import { ProductMaintenanceService } from '../services/product-maintenance-service'
import { ProductTypeService } from '../services/product-type-service'
import { type Product, type ProductType } from '../data/schema'

const logger = createLogger('useProductMgmt')

export function useProductMgmt() {
    const [data, setData] = useState<Product[]>([])
    const [productTypes, setProductTypes] = useState<ProductType[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<string>('all')
    const [activeSubTab, setActiveSubTab] = useState<string>('all')

    const loadAllData = useCallback(async () => {
        setIsLoading(true)
        try {
            const [storedProducts, storedTypes] = await Promise.all([
                ProductCoreService.getProducts(),
                ProductTypeService.getProductTypes(),
            ])
            setData(storedProducts || [])
            setProductTypes(storedTypes || [])
        } catch (error) {
            logger.error('Failed to load product archive data', error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        void loadAllData()
        
        const handleUpdate = () => {
             void loadAllData()
        }

        window.addEventListener('xdfc_products_data_updated', handleUpdate)
        window.addEventListener('xdfc_product_types_data_updated', handleUpdate)

        return () => {
            window.removeEventListener('xdfc_products_data_updated', handleUpdate)
            window.removeEventListener('xdfc_product_types_data_updated', handleUpdate)
        }
    }, [loadAllData])

    useEffect(() => {
        setActiveSubTab('all')
    }, [activeTab])

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

    const handleFormSubmit = async (formData: Product | Product[], isPatch?: boolean, delta?: any) => {
        if (Array.isArray(formData)) {
            await ProductMaintenanceService.bulkSyncProducts(formData)
        } else if (isPatch && formData.id && delta) {
            await ProductMaintenanceService.patchProduct(formData.id, delta, formData.version || 1)
        } else {
            await ProductMaintenanceService.createProduct(formData)
        }
        window.dispatchEvent(new CustomEvent('xdfc_products_data_updated'))
    }

    return {
        data,
        productTypes,
        isLoading,
        activeTab,
        setActiveTab,
        activeSubTab,
        setActiveSubTab,
        topLevelTypes,
        subLevelTypes,
        filteredProducts,
        handleFormSubmit,
        refresh: loadAllData
    }
}
