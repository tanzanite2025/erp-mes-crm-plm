import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type Role } from '../data/role-schema'

type RoleApiDTO = {
  id: string
  label: string
  color?: string
  permissions?: string[]
}

export type UpsertRolePayload = {
  id: string
  label: string
  color?: string
  permissions: string[]
}

function toRoleContract(dto: RoleApiDTO): Role {
  return {
    id: dto.id,
    label: dto.label,
    color: dto.color,
    permissions: Array.isArray(dto.permissions) ? dto.permissions : [],
  }
}

export async function fetchRoles() {
  const response = await apiFetch<RoleApiDTO[]>('/roles')
  return ensureArrayResponse<RoleApiDTO>(response, 'RoleService.fetchRoles').map(toRoleContract)
}

export async function upsertRole(payload: UpsertRolePayload) {
  const response = await apiFetch<RoleApiDTO>('/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return toRoleContract(
    ensureObjectResponse<RoleApiDTO & Record<string, unknown>>(
      response,
      'RoleService.upsertRole',
    ) as RoleApiDTO,
  )
}

export async function deleteRole(roleId: string) {
  return apiFetch(`/roles/${encodeURIComponent(roleId)}`, {
    method: 'DELETE',
  })
}
