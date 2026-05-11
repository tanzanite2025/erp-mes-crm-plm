import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { bomListSchema, bomSchema, type BOM, type BOMList } from '../data/schema'
import { type BOMItemDraft, type BOMSubstitutePatch, type SaveBOMInput } from '@/features/product-structure/mutation-types'
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
    const normalizedData = normalizeBOMInput(data)
    const sanitizedPayload = saveBOMSchema.parse({
        ...normalizedData,
        description: trimToUndefined(data.description),
        revisionNo: trimToUndefined(normalizedData.revisionNo),
        changeOrderNo: trimToUndefined(normalizedData.changeOrderNo),
        siteCode: trimToUndefined(normalizedData.siteCode),
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
            substitutes: (item.substitutes || []).map((substitute: BOMSubstitutePatch) => ({
                ...substitute,
                id: trimToUndefined(substitute.id),
                bomItemId: trimToUndefined(substitute.bomItemId),
                materialId: trimRequiredValue(substitute.materialId),
                notes: trimToUndefined(substitute.notes),
            })),
        })),
    })

    return {
        ...sanitizedPayload,
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
    async getBOMs(productId?: string): Promise<BOM[]> {
        const url = productId ? `/engineering/bom?productId=${productId}` : '/engineering/bom'
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
    }
}
