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
 * 后端 BOM wire format → 前端 zod schema 的字段名重映射。
 *
 * 自从统一 json tag 后（bomVersion + version），wire format 字段名与前端 schema 一致，
 * 不再需要 version/_v 重映射。仅保留日期格式归一化：
 * 后端 `time.Time` 序列化为 ISO 8601 完整时间戳（例：`"2026-06-01T00:00:00Z"`），
 * 但前端 schema 要求 `YYYY-MM-DD`。
 */
function mapBOMWireToSchema(wire: Record<string, unknown>): Record<string, unknown> {
    if (!wire || typeof wire !== 'object') return wire as Record<string, unknown>

    const mapped: Record<string, unknown> = { ...wire }

    // 日期字段：ISO 8601 (`2026-06-01T00:00:00Z`) → 前端协议格式 `YYYY-MM-DD`
    mapped.effectiveFrom = truncateIsoDateToProtocol(mapped.effectiveFrom)
    mapped.effectiveTo = truncateIsoDateToProtocol(mapped.effectiveTo)

    return mapped
}

/**
 * 把后端可能返回的 ISO 8601 时间戳截断为 `YYYY-MM-DD` 协议格式。
 * 保留 null 与 undefined（前端 schema 允许 nullable.optional）。
 */
function truncateIsoDateToProtocol(value: unknown): unknown {
    if (typeof value !== 'string') return value
    if (value.length === 0) return value
    // 只取日期部分；如果原本就是 10 字符 YYYY-MM-DD，slice(0,10) 等价于不变
    return value.slice(0, 10)
}

/**
 * 把前端 SaveBOMInput 转换为后端 wire format 的 payload。
 *
 * 自从统一 json tag 后，前后端字段名一致（bomVersion + version），
 * 不再需要 version/_v 重映射。直接序列化即可。
 */
function sanitizeBOMInput(data: SaveBOMInput): Record<string, unknown> {
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
        relationSidecar: normalizedData.relationSidecar,
        // 🔥 CRITICAL: 保留 _sidecarDelta 用于 SDRTS 协议
        _sidecarDelta: data._sidecarDelta,
    }
}

function normalizeBOMListResponse(response: unknown): BOMList {
    const checked = ensureObjectResponse<Record<string, unknown>>(
        response,
        'BOMService.getBOMs'
    )

    // 列表响应形态：{ items: [...], total, page, pageSize }
    // BOMList.items 的元素是 BOM（不是 BOMItem 行），逐个跑 wire→schema 映射
    const mappedItems = Array.isArray(checked.items)
        ? (checked.items as unknown[]).map((entry) =>
            entry && typeof entry === 'object'
                ? mapBOMWireToSchema(entry as Record<string, unknown>)
                : entry
        )
        : []

    return bomListSchema.parse({
        ...checked,
        items: mappedItems,
    })
}

function normalizeBOMDetailSource(response: unknown): BOMDetailSource {
    const rawSource = ensureObjectResponse<Record<string, unknown>>(
        response,
        'BOMService.getBOMDetailSource'
    )

    return {
        bom: bomSchema.parse(mapBOMWireToSchema(rawSource)),
        rawSource,
    }
}

/**
 * 单条 BOM 响应的统一解析（save / promote / derive / revise 都走这里）。
 */
function parseSingleBOMResponse(res: unknown, scope: string): BOM {
    const wire = ensureObjectResponse<Record<string, unknown>>(res, scope)
    return bomSchema.parse(mapBOMWireToSchema(wire))
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
        return parseSingleBOMResponse(res, 'BOMService.saveBOM')
    },

    async deleteBOM(id: string): Promise<void> {
        await apiFetch<void>(`/engineering/bom/${id}`, {
            method: 'DELETE',
        })
    },

    /**
     * 推进 BOM 状态 (流转状态机)
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
        return parseSingleBOMResponse(res, 'BOMService.promoteBOMStatus')
    },

    /**
     * 从 EBOM 派生 MBOM
     */
    async deriveMBOMFromEBOM(ebomId: string, input: { description?: string; revisionNo?: string; changeOrderNo?: string }): Promise<BOM> {
        const res = await apiFetch<BOM>(`/engineering/bom/${ebomId}/derive-mbom`, {
            method: 'POST',
            body: JSON.stringify(input),
        })
        return parseSingleBOMResponse(res, 'BOMService.deriveMBOMFromEBOM')
    },

    /**
     * 工艺修订当前 MBOM。
     * 后端创建新版本（次版本号 +1，状态直接 RELEASED），旧版本自动 OBSOLETE。
     */
    async reviseMBOM(
        id: string,
        input: { reason: string; changeOrderNo?: string; revisionNo?: string; expectedVersion?: number }
    ): Promise<BOM> {
        const res = await apiFetch<BOM>(`/engineering/bom/${id}/revise`, {
            method: 'POST',
            body: JSON.stringify(input),
        })
        return parseSingleBOMResponse(res, 'BOMService.reviseMBOM')
    },
}
