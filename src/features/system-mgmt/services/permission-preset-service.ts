import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type PermissionPreset } from '../data/permission-preset-schema'

type PermissionPresetApiDTO = {
  id: string
  label: string
  color?: string
  permissions?: string[]
}

export type UpsertPermissionPresetPayload = {
  id: string
  label: string
  color?: string
  permissions: string[]
}

function toPermissionPresetContract(
  dto: PermissionPresetApiDTO
): PermissionPreset {
  return {
    id: dto.id,
    label: dto.label,
    color: dto.color,
    permissions: Array.isArray(dto.permissions) ? dto.permissions : [],
  }
}

export async function fetchPermissionPresets() {
  const response = await apiFetch<PermissionPresetApiDTO[]>(
    '/permission-presets'
  )
  return ensureArrayResponse<PermissionPresetApiDTO>(
    response,
    'PermissionPresetService.fetchPermissionPresets'
  ).map(toPermissionPresetContract)
}

export async function upsertPermissionPreset(
  payload: UpsertPermissionPresetPayload
) {
  const response = await apiFetch<PermissionPresetApiDTO>(
    '/permission-presets',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )

  return toPermissionPresetContract(
    ensureObjectResponse<PermissionPresetApiDTO & Record<string, unknown>>(
      response,
      'PermissionPresetService.upsertPermissionPreset'
    ) as PermissionPresetApiDTO
  )
}

export async function deletePermissionPreset(permissionPresetId: string) {
  return apiFetch(
    `/permission-presets/${encodeURIComponent(permissionPresetId)}`,
    {
      method: 'DELETE',
    }
  )
}
