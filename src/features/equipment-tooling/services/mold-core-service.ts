'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type Mold, type MoldStatus } from '../data/schema'

/**
 * 模具状态流转合法性映射表
 */
export const VALID_MOLD_STATUS_TRANSITIONS: Record<MoldStatus, MoldStatus[]> = {
    'IDLE': ['IN_USE', 'MAINTENANCE', 'LENT_OUT', 'RETIRED', 'CHECKING'],
    'IN_USE': ['IDLE', 'CHECKING', 'MAINTENANCE', 'RETIRED'],
    'CHECKING': ['IDLE', 'MAINTENANCE', 'RETIRED', 'IN_USE'],
    'MAINTENANCE': ['IDLE', 'CHECKING', 'RETIRED'],
    'LENT_OUT': ['IDLE', 'CHECKING'], 
    'BORROWED': ['IDLE', 'RETIRED', 'CHECKING'],
    'RETIRED': [] 
}

type MoldListResponse = {
    data: Mold[]
    version: number
}

type MoldDuplicateCheckResponse = {
    duplicate: boolean
}

type MoldIntegrityCheckResponse = {
    totalProducts: number
    orphanProducts: { sku: string, missingGroup: string }[]
    isHealthy: boolean
}

/**
 * MoldCoreService - 模具资产只读查询服务
 * 职责: 负责所有模具列表、详情搜索及主数据校验。
 */
export const MoldCoreService = {
    /**
     * 获取所有模具及其版本信息 (全量 DTO 转换)
     */
    async getMoldsWithVersion(): Promise<{ molds: Mold[], version: number }> {
        const res = await apiFetch<MoldListResponse>('/molds')
        const response = ensureObjectResponse<MoldListResponse & Record<string, unknown>>(res, 'MoldCoreService.getMoldsWithVersion')
        
        const molds = response.data.map((m) => ({
            ...m,
            totalLifeCycles: m.totalLifeCycles || m.currentCycles || 0,
            status: m.status || 'IDLE',
            isAlerted: m.isAlerted ?? false,
            createdAt: m.createdAt || new Date().toISOString()
        }))

        return { molds, version: response.version }
    },

    /**
     * 获取所有活跃模具
     */
    async getMolds(): Promise<Mold[]> {
        const { molds } = await this.getMoldsWithVersion()
        return molds
    },

    /**
     * 获取单个模具详情
     */
    async getMoldById(id: string): Promise<Mold> {
        const res = await apiFetch<Mold>(`/molds/${id}`)
        return ensureObjectResponse<Mold & Record<string, unknown>>(res, 'MoldCoreService.getMoldById') as Mold
    },

    /**
     * 获取所有唯一的模具分组名称
     */
    async getGroupNames(): Promise<string[]> {
        const molds = await this.getMolds()
        const groups = molds.map(m => m.groupName).filter(Boolean) as string[]
        return Array.from(new Set(groups))
    },

    /**
     * 检查模具编号是否重复
     */
    async isSnDuplicate(sn: string, excludeId?: string): Promise<boolean> {
        const res = await apiFetch<MoldDuplicateCheckResponse>(`/molds/check-sn?sn=${sn}&excludeId=${excludeId || ''}`)
        const response = ensureObjectResponse<MoldDuplicateCheckResponse & Record<string, unknown>>(res, 'MoldCoreService.isSnDuplicate')
        return response.duplicate
    },

    /**
     * 检查数据链路完整性
     */
    async checkLinkIntegrity(): Promise<MoldIntegrityCheckResponse> {
        const res = await apiFetch<MoldIntegrityCheckResponse>('/molds/integrity-check')
        return ensureObjectResponse<MoldIntegrityCheckResponse & Record<string, unknown>>(res, 'MoldCoreService.checkLinkIntegrity') as MoldIntegrityCheckResponse
    }
}
