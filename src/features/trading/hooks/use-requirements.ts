'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSalesOrders } from '../services/trading-service'
import { bomService } from '@/features/engineering/services/bom-service'
import { createLogger } from '@/lib/logger'
import { type SalesOrder } from '../data/schema'
import { type BOM } from '@/features/engineering/data/schema'
import { materialService } from '@/features/material-archive/services/material-service'
import { type Material, type PackagingRule } from '@/features/material-archive/data/schema'
import { productService, type Product } from '@/features/engineering/services/product-service'
import { packagingService } from '@/features/material-archive/services/packaging-service'
import { inventoryService, type InventoryView } from '@/features/warehouse/services/inventory-service'

import { MrpEngine } from '@/features/mrp/services/mrp-engine'
import { type MaterialRequirement, type MrpStats } from '@/features/mrp/data/schema'

const logger = createLogger('useRequirements')

export type { MaterialRequirement }

/**
 * useRequirements Hook
 * 核心业务逻辑：聚合销售订单与 BOM，计算物料毛需求
 */
export function useRequirements() {
    const [requirements, setRequirements] = useState<MaterialRequirement[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<unknown>(null)
    const [stats, setStats] = useState<MrpStats>({
        totalMaterials: 0,
        missingBOMCount: 0,
        activeOrderCount: 0,
        analyzedModels: []
    })

    // --- 局部状态缓存 (实现增量刷新) ---
    const [orders, setOrders] = useState<SalesOrder[]>([])
    const [boms, setBoms] = useState<BOM[]>([])
    const [materials, setMaterials] = useState<Material[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [rules, setRules] = useState<PackagingRule[]>([])
    const [inventory, setInventory] = useState<InventoryView[]>([])

    const fetchOrders = useCallback(async () => {
        const data = await getSalesOrders()
        setOrders(data?.items || [])
    }, [])

    const fetchBOMs = useCallback(async () => {
        const data = await bomService.getBOMs()
        setBoms(data || [])
    }, [])

    const fetchMaterials = useCallback(async () => {
        const data = await materialService.getMaterialOptions()
        setMaterials(data)
    }, [])

    const fetchProducts = useCallback(async () => {
        const data = await productService.getProducts()
        setProducts(data)
    }, [])

    const fetchRules = useCallback(async () => {
        const data = await packagingService.getRules()
        setRules(data)
    }, [])

    const fetchInventory = useCallback(async () => {
        const data = await inventoryService.getInventoryList()
        setInventory(data)
    }, [])

    // --- 核心计算引擎 (数据流驱动) ---
    const runCalculation = useCallback(() => {
        const result = MrpEngine.runCalculation({
            orders,
            boms,
            materials,
            products,
            rules,
            inventory
        })
        
        setRequirements(result.requirements)
        setStats(result.stats)
    }, [orders, boms, materials, products, rules, inventory])

    const loadAllData = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            await Promise.all([fetchOrders(), fetchBOMs(), fetchMaterials(), fetchProducts(), fetchRules(), fetchInventory()])
        } catch (loadError) {
            setError(loadError)
            logger.error('Failed to load requirement dependencies', loadError)
        } finally {
            setIsLoading(false)
        }
    }, [fetchBOMs, fetchInventory, fetchMaterials, fetchOrders, fetchProducts, fetchRules])

    // --- 增量刷新副作用 ---
    useEffect(() => {
        const timer = globalThis.setTimeout(() => {
            void loadAllData()
        }, 0)

        window.addEventListener('xdfc_trading_updated', fetchOrders)
        window.addEventListener('xdfc_sales_orders_updated', fetchOrders)
        window.addEventListener('xdfc_bom_data_updated', fetchBOMs)
        window.addEventListener('xdfc_inventory_updated', fetchInventory)
        window.addEventListener('xdfc_materials_updated', fetchMaterials)
        window.addEventListener('xdfc_packaging_updated', fetchRules)

        return () => {
            globalThis.clearTimeout(timer)
            window.removeEventListener('xdfc_trading_updated', fetchOrders)
            window.removeEventListener('xdfc_sales_orders_updated', fetchOrders)
            window.removeEventListener('xdfc_bom_data_updated', fetchBOMs)
            window.removeEventListener('xdfc_inventory_updated', fetchInventory)
            window.removeEventListener('xdfc_materials_updated', fetchMaterials)
            window.removeEventListener('xdfc_packaging_updated', fetchRules)
        }
    }, [fetchOrders, fetchBOMs, fetchMaterials, fetchProducts, fetchRules, fetchInventory, loadAllData])

    // 数据变化时自动重算
    useEffect(() => {
        runCalculation()
    }, [runCalculation])

    return {
        requirements,
        activeOrders: orders.filter(o => !o.isDeleted && ['Pending', 'InProgress'].includes(o.status)),
        error,
        isLoading,
        stats,
        refresh: async () => {
            await loadAllData()
        },
        calculate: async (selectedKeys?: string[]) => {
            setIsLoading(true)
            if (selectedKeys) {
                logger.info(`Calculating requirements for ${selectedKeys.length} keys...`)
            }
            // 模拟延迟以匹配设计预期
            await new Promise(resolve => setTimeout(resolve, 800))
            runCalculation() 
            setIsLoading(false)
        }
    }
}
