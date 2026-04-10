import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import {
  toBulkSyncMaterialsApiDTO,
  toMaterialContract,
  toSaveMaterialApiDTO,
} from '../adapters/material-api-adapter'
import { type MaterialApiDTO } from '../contracts/material-api-dto'
import { type Material } from '../data/schema'

export const MaterialMaintenanceService = {
  async saveMaterial(material: Partial<Material>): Promise<Material> {
    const updated = await apiFetch<MaterialApiDTO>('/materials', {
      method: 'POST',
      body: JSON.stringify(toSaveMaterialApiDTO(material)),
    })

    return toMaterialContract(
      ensureObjectResponse<MaterialApiDTO & Record<string, unknown>>(
        updated,
        'MaterialMaintenanceService.saveMaterial'
      ) as MaterialApiDTO
    )
  },

  async saveMaterials(
    materials: Partial<Material>[],
    options?: { globalVersion?: number | string }
  ): Promise<void> {
    await apiFetch('/materials/sync', {
      method: 'POST',
      body: JSON.stringify(toBulkSyncMaterialsApiDTO(materials, options)),
    })
  },

  async deleteMaterial(id: string): Promise<void> {
    await apiFetch(`/materials/${id}`, {
      method: 'DELETE',
    })
  },

  async patchMaterial(id: string, delta: DeltaSet, version: number): Promise<Material> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id, version },
    }

    const res = await apiFetch<MaterialApiDTO>(`/materials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return toMaterialContract(
      ensureObjectResponse<MaterialApiDTO & Record<string, unknown>>(
        res,
        'MaterialMaintenanceService.patchMaterial'
      ) as MaterialApiDTO
    )
  },
}
