'use client'

import { useState, useEffect } from 'react'
import { AssetService } from '@/features/equipment-tooling/services/asset-service'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useMoldStatus')

export interface MoldAlert {
    modelName: string
    totalQty: number
    isSufficient: boolean
    totalRemaining: number
    shortage: number
    criticalMolds: {
        sn: string
        health: number
        status: string
    }[]
}

/**
 * useMoldStatus Hook
 * 独立逻辑：输入产品型号列表，异步执行模具体检
 */
export function useMoldStatus(models: { modelName: string; totalQty: number }[]) {
    const [alerts, setAlerts] = useState<MoldAlert[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (models.length === 0) {
            setAlerts([])
            return
        }

        const checkModels = async () => {
            setIsLoading(true)
            try {
                // 移除模拟延迟，直接执行模具体检

                const results = await Promise.all(
                    models.map(async (item) => {
                        const status = await AssetService.checkMoldCapacity(item.modelName, item.totalQty)
                        
                        // 预警规则：
                        // 1. 产能不足
                        // 2. 存在健康度 < 20% 的模具
                        const criticalMolds = status.instances
                            .filter(inst => inst.health < 20 || inst.status === 'CHECKING')
                            .map(inst => ({
                                sn: inst.sn,
                                health: inst.health,
                                status: inst.status
                            }))

                        if (!status.isSufficient || criticalMolds.length > 0) {
                            return {
                                modelName: item.modelName,
                                totalQty: item.totalQty,
                                isSufficient: status.isSufficient,
                                totalRemaining: status.totalRemaining,
                                shortage: status.shortage,
                                criticalMolds
                            } as MoldAlert
                        }
                        return null
                    })
                )

                setAlerts(results.filter((r): r is MoldAlert => r !== null))
            } catch (error) {
                logger.error('Error checking molds', error)
                // 发生错误时不中断主流程，仅返回空预警
                setAlerts([])
            } finally {
                setIsLoading(false)
            }
        }

        checkModels()
    }, [models])

    return { alerts, isLoading }
}
