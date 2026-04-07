'use client'

import { useState, useEffect, useCallback } from 'react'
import { type Mold, type Furnace, type MoldLoan, type MoldStatus, type FurnaceStatus } from '../data/schema'
import { MoldService } from './mold-service'
import { FurnaceService } from './furnace-service'
import { MoldLoanService } from './mold-loan-service'

/**
 * AssetService - 资产管理服务 (Facade 模式 - 已适配后端与性能优化)
 */
export class AssetService {
    static getMolds = MoldService.getMolds.bind(MoldService)
    static getGroupNames = MoldService.getGroupNames.bind(MoldService)
    static saveMolds = MoldService.saveMolds.bind(MoldService)
    static checkMoldCapacity = MoldService.checkMoldCapacity.bind(MoldService)
    static checkLinkIntegrity = MoldService.checkLinkIntegrity.bind(MoldService)

    static getFurnaces = FurnaceService.getFurnaces.bind(FurnaceService)
    static saveFurnaces = FurnaceService.saveFurnaces.bind(FurnaceService)

    static getLoans = MoldLoanService.getLoans.bind(MoldLoanService)

    /**
     * 更新资产遥测数据
     */
    static async updateTelemetry(assetId: string, type: 'MOLD' | 'FURNACE', data: { temp?: number; cycles?: number }) {
        if (type === 'MOLD' && data.cycles !== undefined) {
            await MoldService.updateTelemetry(assetId, data.cycles)
        } else if (type === 'FURNACE' && data.temp !== undefined) {
            await FurnaceService.updateTelemetry(assetId, data.temp)
        }
    }
}

/**
 * useAssets - 具备局部刷新能力的高性能资产 Hook
 */
export function useAssets() {
    const [molds, setMolds] = useState<Mold[]>([])
    const [furnaces, setFurnaces] = useState<Furnace[]>([])
    const [loans, setLoans] = useState<MoldLoan[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const loadMolds = useCallback(async () => {
        try {
            const data = await AssetService.getMolds()
            setMolds(data)
        } catch (err) {
            console.error('[CRITICAL-LOAD] Molds fetch failed:', err)
            throw err
        }
    }, [])

    const loadFurnaces = useCallback(async () => {
        try {
            const data = await AssetService.getFurnaces()
            setFurnaces(data)
        } catch (err) {
            console.error('[CRITICAL-LOAD] Furnaces fetch failed:', err)
            throw err
        }
    }, [])

    const loadLoans = useCallback(async () => {
        try {
            const data = await AssetService.getLoans()
            setLoans(data)
        } catch (err) {
            console.error('[CRITICAL-LOAD] Loans fetch failed:', err)
            throw err
        }
    }, [])

    const loadInitial = useCallback(async () => {
        setIsLoading(true)
        try {
            // 初始并加载仍使用并行请求
            await Promise.all([loadMolds(), loadFurnaces(), loadLoans()])
        } finally {
            setIsLoading(false)
        }
    }, [loadMolds, loadFurnaces, loadLoans])

    useEffect(() => {
        loadInitial()

        // 【精准监听】根据事件类型执行局部刷新，不再触发全量重新加载
        window.addEventListener('xdfc_molds_updated', loadMolds)
        window.addEventListener('xdfc_furnaces_updated', loadFurnaces)
        window.addEventListener('xdfc_mold_loans_updated', loadLoans)

        return () => {
            window.removeEventListener('xdfc_molds_updated', loadMolds)
            window.removeEventListener('xdfc_furnaces_updated', loadFurnaces)
            window.removeEventListener('xdfc_mold_loans_updated', loadLoans)
        }
    }, [loadInitial, loadMolds, loadFurnaces, loadLoans])

    const actions = {
        updateMolds: async (newMolds: Mold[]) => {
            const previousMolds = [...molds]
            setMolds(newMolds) // 乐观更新

            try {
                // 【性能优化】差分更新探测：如果只有一个模具变更，使用 PATCH
                const changedIndices = newMolds
                    .map((m, i) => (JSON.stringify(m) !== JSON.stringify(previousMolds[i]) ? i : -1))
                    .filter((i) => i !== -1)

                if (changedIndices.length === 1 && previousMolds.length === newMolds.length) {
                    const idx = changedIndices[0]
                    const target = newMolds[idx]
                    const original = previousMolds[idx]

                    if (original && target.id === original.id) {
                        const { trackDelta } = await import('@/lib/delta/proxy-tracker')
                        const tracker = trackDelta(original)
                        Object.assign(tracker.data, target)
                        const delta = tracker.commit()

                        if (Object.keys(delta).length > 0) {
                            await MoldService.patchMold(target.id, delta, original.version)
                            return
                        }
                    }
                }

                // 否则使用批量保存
                await AssetService.saveMolds(newMolds)
            } catch (err) {
                setMolds(previousMolds) // 失败回滚
                console.error('[OPTIMISTIC_UI] Update molds failed, rolled back.', err)
                throw err
            }
        },
        updateFurnaces: async (newFurnaces: Furnace[]) => {
            const previousFurnaces = [...furnaces]
            setFurnaces(newFurnaces) // 乐观更新
            try {
                // 【性能优化】差分更新探测
                const changedIndices = newFurnaces
                    .map((f, i) => (JSON.stringify(f) !== JSON.stringify(previousFurnaces[i]) ? i : -1))
                    .filter((i) => i !== -1)

                if (changedIndices.length === 1 && previousFurnaces.length === newFurnaces.length) {
                    const idx = changedIndices[0]
                    const target = newFurnaces[idx]
                    const original = previousFurnaces[idx]

                    if (original && target.id === original.id) {
                        const { trackDelta } = await import('@/lib/delta/proxy-tracker')
                        const tracker = trackDelta(original)
                        Object.assign(tracker.data, target)
                        const delta = tracker.commit()

                        if (Object.keys(delta).length > 0) {
                            await FurnaceService.patchFurnace(target.id, delta, original.version)
                            return
                        }
                    }
                }

                await AssetService.saveFurnaces(newFurnaces)
            } catch (err) {
                setFurnaces(previousFurnaces) // 失败回滚
                throw err
            }
        },
        setAssetStatus: async (id: string, type: 'MOLD' | 'FURNACE', status: MoldStatus | FurnaceStatus) => {
            if (type === 'MOLD') {
                const previousMolds = [...molds]
                // 乐观更新：立即修改本地状态
                setMolds(prev => prev.map(m => m.id === id ? { ...m, status: status as MoldStatus } : m))

                try {
                    await MoldService.changeStatus(id, status as MoldStatus, 'UI 联动调整')
                } catch (err) {
                    setMolds(previousMolds) // 失败处理：还原到旧状态
                    throw err
                }
            } else {
                const previousFurnaces = [...furnaces]
                setFurnaces(prev => prev.map(f => f.id === id ? { ...f, status: status as FurnaceStatus } : f))
                try {
                    await FurnaceService.setStatus(id, status as FurnaceStatus)
                } catch (err) {
                    setFurnaces(previousFurnaces)
                    throw err
                }
            }
        }
    }

    return {
        molds,
        furnaces,
        loans,
        isLoading,
        ...actions,
        reloadMolds: loadMolds,
        reloadFurnaces: loadFurnaces,
        reloadLoans: loadLoans,
        reloadAll: loadInitial
    }
}
