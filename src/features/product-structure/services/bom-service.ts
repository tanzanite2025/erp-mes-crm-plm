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
 * 历史包袱（来自 server/models/bom.go 的 JSON tag）：
 *   - `VersionText`（BOM 版本号字符串，例：'V1.0'）的 JSON tag 是 `"version"`
 *   - `Version`（GORM 自带的乐观锁数字）的 JSON tag 是 `"_v"`
 *
 * 而前端 zod schema 用的字段名是：
 *   - 业务版本号字符串 → `bomVersion`
 *   - 乐观锁数字 → `version`
 *
 * 双方字段名对不上。如果不做映射就丢给 zod parse，会因为 schema 上两个字段都
 * 有 `.default(...)`，zod 静默用默认值兜底（'V1.0' / 1），导致前端永远拿到默认值。
 *
 * 此外还要做日期格式归一化：后端 `time.Time` 序列化为 ISO 8601 完整时间戳
 * （例：`"2026-06-01T00:00:00Z"`），但前端 schema 要求 `YYYY-MM-DD`。
 * 在 mapper 里把日期字段截断到前 10 个字符。
 *
 * 本函数负责在 zod parse 之前把 wire format 重命名到前端 schema 期望的字段名。
 * 是 BOM 双轨命名的**唯一**入口，其他位置都使用前端业务字段名。
 *
 * 与之对称的反向映射在 {@link sanitizeBOMInput} 里：把前端 `version` 重命名回
 * wire format 的 `_v`，把前端 `bomVersion` 反向投回 wire 的 `version`，一并
 * 发给后端，让后端 GORM struct 能正确反序列化。
 */
function mapBOMWireToSchema(wire: Record<string, unknown>): Record<string, unknown> {
    if (!wire || typeof wire !== 'object') return wire as Record<string, unknown>

    const mapped: Record<string, unknown> = { ...wire }

    // wire `version` (string) → schema `bomVersion`
    // 仅当 schema 字段不存在时用 wire 值兜底，避免重复映射后再次 parse 时错位
    if (mapped.bomVersion === undefined && typeof mapped.version === 'string') {
        mapped.bomVersion = mapped.version
        // 删除原 wire 字段，避免与即将赋值的 _v→version 冲突
        delete mapped.version
    }

    // wire `_v` (number) → schema `version`
    if (mapped.version === undefined && typeof mapped._v === 'number') {
        mapped.version = mapped._v
    }

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
 * Wire 双向映射（与 {@link mapBOMWireToSchema} 对称）：
 *   - 前端 `bomVersion` (string) → wire `version` (string)
 *   - 前端 `version` (number) → wire `_v` (number)
 *
 * 后端 GORM struct 读取这两个 wire 字段；前端 schema 字段（`bomVersion` / `version`）
 * 即使一并发出去也会被后端忽略，但保留它们便于调试。
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

    // 拆出 schema 字段，避免与 wire 字段同名冲突
    const { version: schemaVersion, bomVersion: schemaBomVersion, ...rest } = sanitizedPayload

    return {
        ...rest,
        // wire alias：后端读 `_v` 做乐观锁数字
        _v: schemaVersion,
        // wire alias：后端读 `version` 做 BOM 版本号字符串
        version: schemaBomVersion,
        // 同时保留前端字段名，便于跨端调试日志匹配
        bomVersion: schemaBomVersion,
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
