'use client'

import { useState, useEffect, useCallback } from 'react'
import { type MaterialRequirement, type MrpStats } from '../data/requirement-schema'
import { getSalesOrders } from '../sales'
import { requirementService } from '../services/requirement-service'
import { createLogger } from '@/lib/logger'
import { type SalesOrder } from '../data/schema'

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

    const fetchOrders = useCallback(async () => {
        const data = await getSalesOrders({
            withLines: true,
            status: ['Pending', 'InProgress'],
            pageSize: 200,
        })
        // [FAIL-LOUDLY]: 严禁使用 || [] 掩盖物料需求前置单据的缺失
        if (!data?.items) {
            throw new Error('[CRITICAL] Base SalesOrders for MRP are missing from backend response')
        }
        setOrders(data.items)
    }, [])

    const loadAllData = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            await fetchOrders()
        } catch (loadError) {
            setError(loadError)
            logger.error('Failed to load requirement orders', loadError)
        } finally {
            setIsLoading(false)
        }
    }, [fetchOrders])

    // --- 增量刷新副作用 ---
    useEffect(() => {
        const timer = globalThis.setTimeout(() => {
            void loadAllData()
        }, 0)

        window.addEventListener('xdfc_trading_updated', fetchOrders)
        window.addEventListener('xdfc_sales_orders_updated', fetchOrders)

        return () => {
            globalThis.clearTimeout(timer)
            window.removeEventListener('xdfc_trading_updated', fetchOrders)
            window.removeEventListener('xdfc_sales_orders_updated', fetchOrders)
        }
    }, [fetchOrders, loadAllData])

    return {
        requirements,
        activeOrders: orders,
        error,
        isLoading,
        stats,
        refresh: async () => {
            await loadAllData()
        },
        calculate: async (selectedKeys?: string[]) => {
            setIsLoading(true)
            try {
                if (selectedKeys) {
                    logger.info(`Calculating requirements for ${selectedKeys.length} keys...`)
                }
                const result = await requirementService.getMrpRequirements(selectedKeys || [])
                // [FAIL-LOUDLY]: 显式校验 MRP 计算结果
                if (!result.requirements) {
                    throw new Error('[CRITICAL] MRP Calculation returned invalid null requirements')
                }
                setRequirements(result.requirements)
                setStats(result.stats)
                setError(null)
            } catch (calculateError) {
                setError(calculateError)
                logger.error('Failed to calculate requirements from backend', calculateError)
            } finally {
                setIsLoading(false)
            }
        }
    }
}
