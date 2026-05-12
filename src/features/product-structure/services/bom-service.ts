import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { bomListSchema, bomSchema, type BOM, type BOMList } from '../data/schema'
import { type BOMItemDraft, type SaveBOMInput } from '@/features/product-structure/mutation-types'
import { normalizeBOMInput } from '../utils/bom-control-normalization'
import { normalizeBOMSectionValue } from '../utils/bom-section-utils'

const saveBOMSchema = bomSchema.omit({ bomDisplayVersion: true })

export interface BOMDetailSource {
    bom: BOM
    rawSource: Record<string, unknown>
}

function trimToUndefined(value?: string) {
    if (value === undefined) return undefined
    const trimmed = value.trim()
    return trimmed === '' ? undefined : trimmed
}

function trimToNull(value?: string | null) {
    if (value === undefined || value === null) return null
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
}

function trimRequiredValue(value?: string) {
    return (value || '').trim()
}

function sanitizeBOMInput(data: SaveBOMInput): SaveBOMInput {
    const {
        siteCode: _siteCode,
        isDefaultSite: _isDefaultSite,
        ...normalizedData
    } = normalizeBOMInput(data)
    const sanitizedPayload = saveBOMSchema.parse({
        ...normalizedData,
        description: trimToUndefined(data.description),
        revisionNo: trimToUndefined(normalizedData.revisionNo),
        changeOrderNo: trimToUndefined(normalizedData.changeOrderNo),
        effectiveFrom: trimToNull(normalizedData.effectiveFrom),
        effectiveTo: trimToNull(normalizedData.effectiveTo),
        items: data.items.map((item: BOMItemDraft) => ({
            ...item,
            section: normalizeBOMSectionValue([], item.section),
            materialId: trimRequiredValue(item.materialId),
            materialName: trimToUndefined(item.materialName),
            materialSpec: trimToUndefined(item.materialSpec),
            unit: trimRequiredValue(item.unit),
            materialType: trimToUndefined(item.materialType),
            supplyChannel: trimToUndefined(item.supplyChannel),
        })),
    })

    return {
        ...sanitizedPayload,
        _v: sanitizedPayload.version,
        relationSidecar: normalizedData.relationSidecar,
    }
}

function normalizeBOMListResponse(response: unknown): BOMList {
    const checked = ensureObjectResponse<Record<string, unknown>>(
        response,
        'BOMService.getBOMs'
    )

    return bomListSchema.parse(checked)
}

function normalizeBOMDetailSource(response: unknown): BOMDetailSource {
    const rawSource = ensureObjectResponse<Record<string, unknown>>(
        response,
        'BOMService.getBOMDetailSource'
    )

    return {
        bom: bomSchema.parse(rawSource),
        rawSource,
    }
}

/**
 * BOM 配方清单服务层
 */
export const bomService = {
    /**
     * 获取 BOM 列表
     * @param productId 可选，按产品 ID 过滤
     */
    async getBOMs(params?: { productId?: string; status?: string; bomType?: string }): Promise<BOM[]> {
        const query = new URLSearchParams()
        if (params?.productId) query.append('productId', params.productId)
        if (params?.status) query.append('status', params.status)
        if (params?.bomType) query.append('bomType', params.bomType)

        const queryString = query.toString()
        const url = queryString ? `/engineering/bom?${queryString}` : '/engineering/bom'
        
        const response = await apiFetch<BOMList>(url)
        return normalizeBOMListResponse(response).items
    },

    /**
     * 获取单个 BOM 详情
     */
    async getBOMDetailSource(id: string): Promise<BOMDetailSource> {
        const response = await apiFetch<unknown>(`/engineering/bom/${id}`)
        return normalizeBOMDetailSource(response)
    },

    async getBOMById(id: string): Promise<BOM> {
        return (await this.getBOMDetailSource(id)).bom
    },

    /**
     * 保存或更新 BOM
     */
    async saveBOM(params: { data: SaveBOMInput }): Promise<BOM> {
        const sanitizedData = sanitizeBOMInput(params.data)

        const res = await apiFetch<BOM>('/engineering/bom', {
            method: 'POST',
            body: JSON.stringify(sanitizedData),
        })
        return bomSchema.parse(
            ensureObjectResponse<Record<string, unknown>>(res, 'BOMService.saveBOM')
        )
    },

    async deleteBOM(id: string): Promise<void> {
        await apiFetch<void>(`/engineering/bom/${id}`, {
            method: 'DELETE',
        })
    },

    /**
     * 推进 BOM 状态 (流转状态机)
     * @param id BOM ID
     * @param status 目标状态
     * @param expectedVersion 可选的期望版本号（用于乐观锁）
     */
    async promoteBOMStatus(id: string, status: string, expectedVersion?: number): Promise<BOM> {
        const payload: Record<string, unknown> = { status }
        if (expectedVersion !== undefined) {
            payload.expectedVersion = expectedVersion
        }
        
        const res = await apiFetch<BOM>(`/engineering/bom/${id}/promote`, {
            method: 'POST',
            body: JSON.stringify(payload),
        })
        return bomSchema.parse(
            ensureObjectResponse<Record<string, unknown>>(res, 'BOMService.promoteBOMStatus')
        )
    },

    /**
     * 从EBOM派生MBOM
     * @param ebomId 源EBOM的ID
     * @param input 派生参数
     */
    async deriveMBOMFromEBOM(ebomId: string, input: { description?: string; revisionNo?: string; changeOrderNo?: string }): Promise<BOM> {
        const res = await apiFetch<BOM>(`/engineering/bom/${ebomId}/derive-mbom`, {
            method: 'POST',
            body: JSON.stringify(input),
        })
        return bomSchema.parse(
            ensureObjectResponse<Record<string, unknown>>(res, 'BOMService.deriveMBOMFromEBOM')
        )
    }
}
