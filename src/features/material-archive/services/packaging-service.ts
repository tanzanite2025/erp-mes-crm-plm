import { apiFetch } from '@/lib/api-client'
import { type PackagingRule } from '../data/schema'

/**
 * 包装换算规则服务 (已同步至后端)
 */
export const packagingService = {
    /**
     * 获取全量换算规则
     */
    async getRules(): Promise<PackagingRule[]> {
        const data = await apiFetch<PackagingRule[]>('/packaging')
        if (!data) throw new Error('[CRITICAL] 未能从后端获取包装换算规则')
        return data
    },

    /**
     * 根据物料 ID 获取规则
     */
    async getRuleByMaterialId(materialId: string): Promise<PackagingRule | null> {
        // 后端应支持按 materialId 过滤
        return apiFetch<PackagingRule | null>(`/packaging?materialId=${materialId}`)
    },

    /**
     * 保存/更新规则
     */
    async saveRule(rule: Partial<PackagingRule>): Promise<PackagingRule> {
        const result = await apiFetch<PackagingRule>('/packaging', {
            method: 'POST',
            body: JSON.stringify(rule)
        })
        
        window.dispatchEvent(new CustomEvent('xdfc_packaging_updated'))
        return result
    },

    /**
     * 删除规则
     */
    async deleteRule(id: string): Promise<void> {
        await apiFetch(`/packaging/${id}`, {
            method: 'DELETE'
        })
        window.dispatchEvent(new CustomEvent('xdfc_packaging_updated'))
    }
}
