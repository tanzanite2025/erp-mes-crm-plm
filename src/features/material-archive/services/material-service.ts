import { type Material } from '../data/schema'
import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

/**
 * 物料档案存储服务 (已同步至后端)
 */

export const getMaterialOptions = async (): Promise<Material[]> => {
    const res = await apiFetch<{ data: Material[], version: string }>('/materials?options=true')
    const checked = ensureObjectResponse<{ data: Material[], version: string } & Record<string, unknown>>(res, 'MaterialService.getMaterialOptions')
    return checked.data
}

export const getMaterials = async (category?: string, page: number = 1, pageSize: number = 20, search: string = ''): Promise<{ data: Material[], total: number }> => {
    const { molds: data, total } = await getMaterialsWithVersion(category, page, pageSize, search)
    return { data, total }
}

/**
 * 获取物料列表及其全局快照版本 (用于 Excel 导出锁定)
 */
export const getMaterialsWithVersion = async (category?: string, page: number = 1, pageSize: number = 20, search: string = ''): Promise<{ molds: Material[], total: number, version: string }> => {
    const params = new URLSearchParams()
    if (category && category !== 'all') params.append('category', category.toUpperCase())
    params.append('page', page.toString())
    params.append('pageSize', pageSize.toString())
    if (search) params.append('search', search)
    
    const endpoint = `/materials?${params.toString()}`
    
    const res = await apiFetch<{ data: Material[], total: number, version: string }>(endpoint)
    const checked = ensureObjectResponse<{ data: Material[], total: number, version: string } & Record<string, unknown>>(res, 'MaterialService.getMaterialsWithVersion')
    
    return { 
        molds: checked.data,
        total: checked.total || 0,
        version: checked.version || "1" 
    }
}

export const saveMaterial = async (material: Partial<Material>): Promise<Material> => {
    // 后端应负责编码唯一性校验与 ID 生成
    const updated = await apiFetch<Material>('/materials', {
        method: 'POST',
        body: JSON.stringify(material)
    })
    
    window.dispatchEvent(new CustomEvent('xdfc_materials_updated'))
    return updated
}

/**
 * 批量同步物料 (对接云端同步协议)
 * 包含版本指纹对比逻辑，防止 Excel 模板脏覆盖
 */
export const saveMaterials = async (
    materials: Partial<Material>[],
    options?: { globalVersion?: number }
): Promise<void> => {
    // 发送至后端同步终点，后端应处理 globalVersion 校验及事务
    await apiFetch('/materials/sync', {
        method: 'POST',
        body: JSON.stringify({
            materials,
            globalVersion: options?.globalVersion
        })
    })

    window.dispatchEvent(new CustomEvent('xdfc_materials_updated'))
}

export const deleteMaterial = async (id: string): Promise<void> => {
    await apiFetch(`/materials/${id}`, {
        method: 'DELETE'
    })
    window.dispatchEvent(new CustomEvent('xdfc_materials_updated'))
}

/**
 * Patch Material (SDRTS Delta Protocol)
 */
export const patchMaterial = async (id: string, delta: DeltaSet, version: number): Promise<Material> => {
    const payload: DeltaPayload = {
        op: 'PATCH',
        delta,
        metadata: { id, version }
    };

    const res = await apiFetch<Material>(`/materials/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
    });

    window.dispatchEvent(new CustomEvent('xdfc_materials_updated'));
    return ensureObjectResponse<Material & Record<string, unknown>>(res, 'MaterialService.patchMaterial') as Material;
}

export const materialService = {
    getMaterials,
    getMaterialsWithVersion,
    getMaterialOptions,
    saveMaterial,
    saveMaterials,
    deleteMaterial,
    patchMaterial
}

export type { Material }
