'use client'

import { useState, useEffect, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import { getSalesOrders } from '@/features/trading/sales'
import { type SalesOrder } from '@/features/trading/data/schema'
import { type MaterialRequirement, type MrpStats } from '../data/requirement-schema'
import { requirementService } from '../services/requirement-service'

const logger = createLogger('useRequirements')

export type { MaterialRequirement }

export function useRequirements() {
  const [requirements, setRequirements] = useState<MaterialRequirement[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [stats, setStats] = useState<MrpStats>({
    totalMaterials: 0,
    missingBOMCount: 0,
    activeOrderCount: 0,
    analyzedModels: [],
  })
  const [orders, setOrders] = useState<SalesOrder[]>([])

  const fetchOrders = useCallback(async () => {
    const data = await getSalesOrders({
      withLines: true,
      status: ['Pending', 'InProgress'],
      pageSize: 200,
    })
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
    },
  }
}
