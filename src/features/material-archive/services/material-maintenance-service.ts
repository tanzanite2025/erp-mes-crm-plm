import { type Material } from '../data/schema'
import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

/**
 * MaterialMaintenanceService: 专注于物料档案的写入与维护逻辑
 * 遵循 SDRTS (差量更新) 和 TDO (事务型数据对象) 规范。
 */
export const MaterialMaintenanceService = {
  /**
   * 保存单个物料 (POST/PUT)
   * 后端应负责物料编码的唯一性校验与 ID 分配。
   */
  async saveMaterial(material: Partial<Material>): Promise<Material> {
    const updated = await apiFetch<Material>('/materials', {
      method: 'POST',
      body: JSON.stringify(material),
    })

    // 副作用 (Event Dispatch) 已统一迁移至 UI Hook 层的 onSuccess
    return updated
  },

  /**
   * 批量同步物料 (对接云端同步协议)
   * 包含版本指纹对比逻辑，防止 Excel 模板脏覆盖。
   */
  async saveMaterials(
    materials: Partial<Material>[],
    options?: { globalVersion?: string }
  ): Promise<void> {
    await apiFetch('/materials/sync', {
      method: 'POST',
      body: JSON.stringify({
        materials,
        globalVersion: options?.globalVersion,
      }),
    })
  },

  /**
   * 删除物料
   */
  async deleteMaterial(id: string): Promise<void> {
    await apiFetch(`/materials/${id}`, {
      method: 'DELETE',
    })
  },

  /**
   * SDRTS 差量更新 (Delta Protocol)
   * 支持高精度审计日志与细粒度合并。
   */
  async patchMaterial(id: string, delta: DeltaSet, version: number): Promise<Material> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id, version },
    }

    const res = await apiFetch<Material>(`/materials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return ensureObjectResponse<Material & Record<string, unknown>>(
      res,
      'MaterialMaintenanceService.patchMaterial'
    ) as Material
  },
}
