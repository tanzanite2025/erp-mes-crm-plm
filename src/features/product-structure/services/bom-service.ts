import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { bomListSchema, bomSchema, type BOM, type BOMList } from '../data/schema'
import { type BOMItemDraft, type SaveBOMInput } from '@/features/product-structure/mutation-types'
import { normalizeBOMInput } from '../utils/bom-control-normalization'
import { normalizeBOMSectionValue } from '../utils/bom-section-utils'

const saveBOMSchema = bomSchema

export interface BOMDetailSource {
    bom: BOM
    rawSource: Record<string, unknown>
}

/**
 * 清洗 BOM 输入数据
 *
 * 注意：Zod schema 已经包含 .trim() 处理，这里只做必要的结构转换
 * 避免重复的手动 trim 操作。
 *
 * Wire format 兼容性：后端 `models.BOM.Version` 的 JSON 标签是 `_v`（历史包袱，
 * 与 GORM 自带的 `Version` 字段名冲突时手动 alias 出来），
 * 而前端业务层用 `version`。本函数是双轨转换的**唯一**入口，
 * 把 `version` 重命名为 `_v` 后发给后端；其他位置的代码一律使用 `version`。
 */
function sanitizeBOMInput(data: SaveBOMInput): SaveBOMInput & { _v?: number } {
    const {
        siteCode: _siteCode,
        isDefaultSite: _isDefaultSite,
        ...normalizedData
    } = normalizeBOMInput(data)
    
    // Zod schema 会自动处理 trim，我们只需要做结构转换
    const sanitizedPayload = saveBOMSchema.parse({
        ...normalizedData,
        items: data.items.map((item: BOMItemDraft) => ({
            ...item,
            section: normalizeBOMSectionValue([], item.section),
        })),
    })

    return {
        ...sanitizedPayload,
        // wire format alias：后端读 _v 做乐观锁
        _v: sanitizedPayload.version,
        relationSidecar: normalizedData.relationSidecar,
        // 🔥 CRITICAL: 保留 _sidecarDelta 用于 SDRTS 协议
        // 这是审计日志和增量更新的关键数据
        _sidecarDelta: data._sidecarDelta,
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
     * @param reason 可选的状态转换原因
     * @param approverComment 可选的审批意见
     */
    async promoteBOMStatus(
        id: string,
        status: string,
        expectedVersion?: number,
        reason?: string,
        approverComment?: string
    ): Promise<BOM> {
        const payload: Record<string, unknown> = { status }
        if (expectedVersion !== undefined) {
            payload.expectedVersion = expectedVersion
        }
        if (reason) {
            payload.reason = reason
        }
        if (approverComment) {
            payload.approverComment = approverComment
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
    },

    /**
     * 工艺修订当前 MBOM。
     * 后端会创建新版本（次版本号 +1，状态直接 RELEASED），旧版本自动 OBSOLETE。
     */
    async reviseMBOM(
        id: string,
        input: { reason: string; changeOrderNo?: string; revisionNo?: string; expectedVersion?: number }
    ): Promise<BOM> {
        const res = await apiFetch<BOM>(`/engineering/bom/${id}/revise`, {
            method: 'POST',
            body: JSON.stringify(input),
        })
        return bomSchema.parse(
            ensureObjectResponse<Record<string, unknown>>(res, 'BOMService.reviseMBOM')
        )
    }
}
