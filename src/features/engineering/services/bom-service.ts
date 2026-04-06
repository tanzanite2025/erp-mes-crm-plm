import { apiFetch } from '@/lib/api-client'
import { type BOM } from '../data/schema'

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
        return apiFetch<BOM[]>(url)
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
    async saveBOM(bom: Partial<BOM>): Promise<BOM> {
        return apiFetch<BOM>('/engineering/bom', {
            method: 'POST',
            body: JSON.stringify(bom),
        })
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
