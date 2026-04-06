'use client'

import { useState, useEffect, useMemo } from 'react'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { type Product } from '@/features/engineering/data/schema'
import { type Mold } from '../data/schema'

export function useMoldGroups(molds: Mold[], searchTerm: string) {
    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // 1. 加载产品库数据用于反查关联
    useEffect(() => {
        const loadProducts = async () => {
            setIsLoading(true)
            try {
                const data = await StorageService.getItem<Product[]>('xdfc_products_data')
                setProducts(data || [])
            } finally {
                setIsLoading(false)
            }
        }
        loadProducts()
        
        // 监听产品更新事件同步刷新
        window.addEventListener('xdfc_products_data_updated', loadProducts)
        return () => window.removeEventListener('xdfc_products_data_updated', loadProducts)
    }, [])

    // 2. 构建 分组 -> 产品列表 的映射缓存
    const groupToProducts = useMemo(() => {
        const map: Record<string, string[]> = {}
        products.forEach(p => {
            if (p.moldGroup) {
                if (!map[p.moldGroup]) map[p.moldGroup] = []
                map[p.moldGroup].push(p.sku)
            }
        })
        return map
    }, [products])

    // 3. 执行过滤逻辑 (搜索 SN、名称、分组名、或关联产品型号)
    const filteredMolds = useMemo(() => {
        return molds.filter(m => {
            const matchesBasic = 
                m.sn.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.groupName && m.groupName.toLowerCase().includes(searchTerm.toLowerCase()))
            
            // 搜索关联产品型号 (动态反查结果)
            const associatedProducts = m.groupName ? (groupToProducts[m.groupName] || []) : []
            const matchesProducts = associatedProducts.some(sku => 
                sku.toLowerCase().includes(searchTerm.toLowerCase())
            )
            
            return matchesBasic || matchesProducts
        })
    }, [molds, searchTerm, groupToProducts])

    // 4. 按分组名称对模具进行聚合
    const groupedMolds = useMemo(() => {
        return filteredMolds.reduce((acc, mold) => {
            const group = mold.groupName || '未分类'
            if (!acc[group]) acc[group] = []
            acc[group].push(mold)
            return acc
        }, {} as Record<string, Mold[]>)
    }, [filteredMolds])

    const groupNames = useMemo(() => {
        return Object.keys(groupedMolds).sort()
    }, [groupedMolds])

    return {
        groupNames,
        groupedMolds,
        groupToProducts,
        isLoadingProducts: isLoading,
        allProducts: products
    }
}
