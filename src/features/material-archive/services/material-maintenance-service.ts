import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import {
  assertRequiredVersion,
  buildVersionedPatchMetadata,
} from '@/lib/version-guard'
import {
  toBulkSyncMaterialsApiDTO,
  toMaterialContract,
  toSaveMaterialApiDTO,
} from '../adapters/material-api-adapter'
import {
  bulkSyncMaterialsApiDTOSchema,
  materialApiDTOSchema,
  saveMaterialApiDTOSchema,
  type MaterialApiDTO,
} from '../contracts/material-api-contract'
import { type Material } from '../data/schema'

function parseMaterial(item: unknown, scope: string): MaterialApiDTO {
  return materialApiDTOSchema.parse(
    ensureObjectResponse<Record<string, unknown>>(
      item as Record<string, unknown>,
      scope
    )
  )
}

export const MaterialMaintenanceService = {
  async saveMaterial(material: Partial<Material>): Promise<Material> {
    const payload = saveMaterialApiDTOSchema.parse(
      toSaveMaterialApiDTO(material)
    )
    const updated = await apiFetch<MaterialApiDTO>('/materials', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return toMaterialContract(
      parseMaterial(updated, 'MaterialMaintenanceService.saveMaterial')
    )
  },

  async saveMaterials(
    materials: Partial<Material>[],
    options?: { globalVersion?: number | string }
  ): Promise<void> {
    const payload = bulkSyncMaterialsApiDTOSchema.parse(
      toBulkSyncMaterialsApiDTO(materials, options)
    )
    await apiFetch('/materials/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async deleteMaterial(id: string): Promise<void> {
    await apiFetch(`/materials/${id}`, {
      method: 'DELETE',
    })
  },

  async patchMaterial(
    id: string,
    delta: DeltaSet,
    version: number
  ): Promise<Material> {
    const expectedVersion = assertRequiredVersion(
      version,
      'MaterialMaintenanceService.patchMaterial',
      id
    )

    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: buildVersionedPatchMetadata(
        id,
        expectedVersion,
        'MaterialMaintenanceService.patchMaterial'
      ),
    }

    const res = await apiFetch<MaterialApiDTO>(`/materials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return toMaterialContract(
      parseMaterial(res, 'MaterialMaintenanceService.patchMaterial')
    )
  },
}
