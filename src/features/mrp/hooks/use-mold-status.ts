'use client'

import { useEffect, useState } from 'react'
import { createLogger } from '@/lib/logger'
import { AssetService } from '@/features/equipment-tooling/services/asset-service'
import { type MoldCapacityAlert } from '@/features/equipment-tooling/services/mold-transaction-service'

const logger = createLogger('useMoldStatus')

export type MoldAlert = MoldCapacityAlert

export function useMoldStatus(
  models: { modelName: string; totalQty: number }[]
) {
  const [alerts, setAlerts] = useState<MoldAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (models.length === 0) {
      setAlerts([])
      return
    }

    let active = true

    const checkModels = async () => {
      setIsLoading(true)
      try {
        const result = await AssetService.checkMoldCapacityAlerts(
          models.map((item) => ({
            groupName: item.modelName,
            requestedQty: item.totalQty,
          }))
        )

        if (!active) return
        setAlerts(result)
      } catch (error) {
        logger.error('Error checking mold alerts', error)
        if (!active) return
        setAlerts([])
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void checkModels()

    return () => {
      active = false
    }
  }, [models])

  return { alerts, isLoading }
}
