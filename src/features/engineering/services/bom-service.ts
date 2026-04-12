import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { normalizeBomChangeType, normalizeBomEffectiveDate, normalizeBomNo, normalizeBomStatus, normalizeBomVersion } from '@/lib/codecs/code-normalization'
import { type BOM } from '../data/schema'
import { type SaveBOMInput } from '../mutation-types'

type BOMListResponse = {
    items: BOM[]
    total: number
    page: number
    pageSize: number
}

function normalizeBOMInput(data: SaveBOMInput): SaveBOMInput {
    const { ...rest } = data
    return {
        ...rest,
        bomNo: normalizeBomNo(data.bomNo),
        bomVersion: normalizeBomVersion(data.bomVersion),
        changeType: normalizeBomChangeType(data.changeType),
        status: normalizeBomStatus(data.status),
        effectiveFrom: normalizeBomEffectiveDate(data.effectiveFrom),
        effectiveTo: normalizeBomEffectiveDate(data.effectiveTo),
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
    async getBOMs(productId?: string): Promise<BOM[]> {
        const url = productId ? `/engineering/bom?productId=${productId}` : '/engineering/bom'
        const response = await apiFetch<BOMListResponse>(url)
        const checked = ensureObjectResponse<BOMListResponse & Record<string, unknown>>(
            response,
            'BOMService.getBOMs'
        )
        return ensureArrayResponse(checked.items, 'BOMService.getBOMs.items')
    },

    /**
     * 获取单个 BOM 详情
     */
    async getBOMById(id: string): Promise<BOM> {
        return await apiFetch<BOM>(`/engineering/bom/${id}`)
    },

    /**
     * 保存或更新 BOM
     */
    async saveBOM(params: { data: SaveBOMInput; isPatch?: boolean; delta?: DeltaSet }): Promise<BOM> {
        const { data, isPatch, delta } = params
        const normalizedData = normalizeBOMInput(data)
        if (isPatch && data.id && delta) {
            const payload: DeltaPayload = {
                op: 'PATCH',
                delta,
                metadata: { id: normalizedData.id, version: normalizedData.version },
            }
            const res = await apiFetch<BOM>(`/engineering/bom/${normalizedData.id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            })
            return ensureObjectResponse<BOM>(res, 'BOMService.patchBOM')
        }

        const res = await apiFetch<BOM>('/engineering/bom', {
            method: 'POST',
            body: JSON.stringify(normalizedData),
        })
        return ensureObjectResponse<BOM>(res, 'BOMService.saveBOM')
    },

    /**
     * 删除 BOM (后端暂未实现 DELETE 接口，可根据需要补充)
     */
    async deleteBOM(id: string): Promise<void> {
        await apiFetch<void>(`/engineering/bom/${id}`, {
            method: 'DELETE',
        })
    }
}
