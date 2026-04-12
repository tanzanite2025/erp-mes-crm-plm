import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { bomListSchema, bomSchema, type BOM, type BOMList } from '../data/schema'
import { type SaveBOMInput } from '../mutation-types'
import { normalizeBOMInput } from '../utils/product-code-normalization'

const saveBOMSchema = bomSchema.omit({ bomDisplayVersion: true })

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

function sanitizeBOMInput(data: SaveBOMInput): SaveBOMInput {
    const normalizedData = normalizeBOMInput(data)
    return saveBOMSchema.parse({
        ...normalizedData,
        description: trimToUndefined(data.description),
        revisionNo: trimToUndefined(data.revisionNo),
        changeOrderNo: trimToUndefined(data.changeOrderNo),
        siteCode: trimToUndefined(data.siteCode),
        effectiveFrom: trimToNull(data.effectiveFrom),
        effectiveTo: trimToNull(data.effectiveTo),
        items: data.items.map((item) => ({
            ...item,
            section: item.section.trim(),
            materialId: item.materialId.trim(),
            materialName: trimToUndefined(item.materialName),
            materialSpec: trimToUndefined(item.materialSpec),
            unit: item.unit.trim(),
            materialType: trimToUndefined(item.materialType),
            supplyChannel: trimToUndefined(item.supplyChannel),
            substitutes: item.substitutes.map((substitute) => ({
                ...substitute,
                id: trimToUndefined(substitute.id),
                bomItemId: trimToUndefined(substitute.bomItemId),
                materialId: substitute.materialId.trim(),
                notes: trimToUndefined(substitute.notes),
            })),
        })),
    })
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
        const checked = ensureObjectResponse<Record<string, unknown>>(
            response,
            'BOMService.getBOMs'
        )
        return bomListSchema.parse(checked).items
    },

    /**
     * 获取单个 BOM 详情
     */
    async getBOMById(id: string): Promise<BOM> {
        const response = await apiFetch<BOM>(`/engineering/bom/${id}`)
        return bomSchema.parse(
            ensureObjectResponse<Record<string, unknown>>(response, 'BOMService.getBOMById')
        )
    },

    /**
     * 保存或更新 BOM
     */
    async saveBOM(params: { data: SaveBOMInput; isPatch?: boolean; delta?: DeltaSet }): Promise<BOM> {
        const { data, isPatch, delta } = params
        const sanitizedData = sanitizeBOMInput(data)
        if (isPatch && data.id && delta) {
            const payload: DeltaPayload = {
                op: 'PATCH',
                delta,
                metadata: { id: sanitizedData.id, version: sanitizedData.version },
            }
            const res = await apiFetch<BOM>(`/engineering/bom/${sanitizedData.id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            })
            return bomSchema.parse(
                ensureObjectResponse<Record<string, unknown>>(res, 'BOMService.patchBOM')
            )
        }

        const res = await apiFetch<BOM>('/engineering/bom', {
            method: 'POST',
            body: JSON.stringify(sanitizedData),
        })
        return bomSchema.parse(
            ensureObjectResponse<Record<string, unknown>>(res, 'BOMService.saveBOM')
        )
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
