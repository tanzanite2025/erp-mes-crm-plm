import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { type Role } from '../data/role-schema'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

const logger = createLogger('RoleService')

type RoleApiRecord = {
  id: string
  label: string
  color: string
  permissions: string[]
  version: number
}

export class RoleService {
  private static API_URL = '/roles'

  /** Load all roles from backend. */
  static async getRoles(): Promise<Role[]> {
    try {
      const data = await apiFetch<RoleApiRecord[]>(this.API_URL)
      return data.map((item) => ({
        id: item.id,
        label: item.label,
        color: item.color,
        permissions: item.permissions,
        version: item.version,
      }))
    } catch (error) {
      logger.error('Failed to fetch roles', error)
      throw error
    }
  }

  /** Create or update one role. */
  static async upsertRole(role: Role): Promise<Role> {
    try {
      const payload = {
        id: role.id,
        label: role.label,
        color: role.color,
        permissions: role.permissions,
      }

      const data = await apiFetch<RoleApiRecord>(this.API_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      return {
        id: data.id,
        label: data.label,
        color: data.color,
        permissions: data.permissions,
        version: data.version,
      }
    } catch (error) {
      logger.error('Failed to upsert role', error)
      throw error
    }
  }

  /**
   * 局部更新角色信息 (SDRTS 结构化差量更新)
   */
  static async patchRole(id: string, delta: DeltaSet, version: number): Promise<Role> {
    try {
      const payload: DeltaPayload = {
        op: 'PATCH',
        delta,
        metadata: {
          id,
          version,
        },
      }

      const data = await apiFetch<RoleApiRecord>(`${this.API_URL}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      return {
        id: data.id,
        label: data.label,
        color: data.color,
        permissions: data.permissions,
        version: data.version,
      }
    } catch (error) {
      logger.error('Failed to patch role', error)
      throw error
    }
  }

  /** Delete role by role id. */
  static async deleteRole(roleId: string): Promise<void> {
    try {
      await apiFetch(`${this.API_URL}/${roleId}`, { method: 'DELETE' })
    } catch (error) {
      logger.error('Failed to delete role', error)
      throw error
    }
  }
}

