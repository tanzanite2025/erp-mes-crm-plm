/**
 * 打印批次记录模型
 */
export interface PrintBatch {
    id: string
    batchNo: string         // 批次号，如 P20260321-001
    templateName: string    // 模板名称
    productId?: string      // 关联产品 ID (可选)
    bomId?: string          // 关联 BOM ID (可选)
    quantity: number        // 计划打印数量
    activatedCount: number  // 已核验激活数量
    status: 'Printed' | 'PartiallyActivated' | 'Activated' | 'Scrapped'
    createdAt: string
    _v: number              // 乐观锁版本号
}

import { ensureObjectResponse } from '@/lib/api-response'
import { apiFetch } from '@/lib/api-client'

const UPDATE_EVENT = 'xdfc_print_batches_updated'

/**
 * 打印记录服务 - 负责批次管理与激活统计 (已对接后端 & 鲁棒性加固)
 */
export const PrintRecordService = {
    /**
     * 获取所有打印批次
     */
    async getBatches(): Promise<PrintBatch[]> {
        return apiFetch<PrintBatch[]>('/print-batches')
    },

    /**
     * 获取下一个递增序列号 (后端原子化发号器)
     * @param key 业务主键，如 'product:UUID:dm_sn'
     */
    async getNextSequence(key: string): Promise<{ value: number, sn: string }> {
        return apiFetch<{ value: number, sn: string }>(`/print-batches/next-sequence?key=${encodeURIComponent(key)}`)
    },

    /**
     * 原子化打印接口 (发号 + 记录 + 审计一次性完成)
     */
    async atomicPrint(data: {
        productId: string
        bomId?: string
        templateName: string
        quantity: number
    }): Promise<{ batch: PrintBatch, sn: string }> {
        return apiFetch<{ batch: PrintBatch, sn: string }>('/print-batches/atomic-print', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    /**
     * 新增打印批次 (BatchNo 由后端通过事务安全生成)
     */
    async addBatch(batch: Omit<PrintBatch, 'id' | 'createdAt' | 'batchNo' | 'activatedCount' | 'status' | '_v'>): Promise<PrintBatch> {
        // 【加固】BatchNo 不再由前端提前计算，防止并发碰撞
        // 后端 handle 会在保存时自动生成 P-YYYYMMDD-XXX 格式编号
        const newBatch = await apiFetch<PrintBatch>('/print-batches', {
            method: 'POST',
            body: JSON.stringify(batch)
        })

        window.dispatchEvent(new CustomEvent(UPDATE_EVENT))
        return newBatch
    },

    /**
     * 核验激活 (批量或单个)
     * @param id 批次 ID
     * @param count 激活数量
     * @param version 当前客户端持有的版本号 (用于乐观锁)
     */
    async activate(id: string, count: number, version: number): Promise<PrintBatch | null> {
        const updated = await apiFetch<PrintBatch>(`/print-batches/${id}/activate`, {
            method: 'POST',
            body: JSON.stringify({ 
                count,
                _v: version 
            })
        })

        window.dispatchEvent(new CustomEvent(UPDATE_EVENT))
        return updated
    },

    /**
     * 报废批次
     */
    async scrap(id: string): Promise<boolean> {
        await apiFetch(`/print-batches/${id}/scrap`, {
            method: 'POST'
        })
        window.dispatchEvent(new CustomEvent(UPDATE_EVENT))
        return true
    },

    /**
     * 获取打印批次综合统计 (已对接后端权威聚合)
     */
    async getPrintStats(): Promise<{ totalActivated: number, totalScrapped: number }> {
        const res = await apiFetch<{ totalActivated: number, totalScrapped: number }>('/print-batches/stats')
        return ensureObjectResponse<Record<string, unknown>>(res, 'PrintRecordService.getPrintStats') as { totalActivated: number, totalScrapped: number }
    },

    /**
     * 获取总激活量 (已迁移至后端)
     */
    async getTotalActivatedCount(): Promise<number> {
        const stats = await this.getPrintStats()
        return stats.totalActivated
    },

    /**
     * 获取报废总量 (已迁移至后端)
     */
    async getScrapCount(): Promise<number> {
        const stats = await this.getPrintStats()
        return stats.totalScrapped
    }
}
