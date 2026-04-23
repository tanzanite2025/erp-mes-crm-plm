import { useEffect, useState } from 'react'
import { getDefaultPermissions } from '@/features/authz/data/default-permission-queries'
import { trackDelta } from '@/lib/delta/proxy-tracker'
import { toast } from 'sonner'
import { type Permission, type Role } from '../data/role-schema'
import { RoleService } from '../services/role-service'
import { buildTreeAssistedPermissionIds, sortPermissionIds } from '../utils/role-permission-tree'

function isSuperAdminRoleId(roleId: string): boolean {
  const normalized = roleId.trim().toLowerCase()
  return normalized === 'superadmin' || normalized === 'admin'
}

function isProtectedRoleId(roleId: string): boolean {
  return isSuperAdminRoleId(roleId)
}

function isRenamable(roleId: string): boolean {
  return !isSuperAdminRoleId(roleId)
}

function buildUserFacingErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return `${fallback}：${error.message.trim()}`
  }
  return fallback
}

export function useRoles(enabled = true) {
  const permissions: Permission[] = getDefaultPermissions()
  const [roles, setRoles] = useState<Role[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const persistRole = async (roleId: string, mutateDraft: (draft: Role) => void) => {
    const role = roles.find((item) => item.id === roleId)
    if (!role) return null

    const tracker = trackDelta(role)
    const draft = tracker.data as Role
    mutateDraft(draft)
    const delta = tracker.commit()

    if (Object.keys(delta).length === 0) {
      return role
    }

    const result = await RoleService.upsertRole(draft)
    setRoles((prev) => prev.map((item) => (item.id === roleId ? result : item)))
    return result
  }

  useEffect(() => {
    if (!enabled) {
      setRoles([])
      setError(null)
      setIsInitialLoading(false)
      return
    }

    setIsInitialLoading(true)

    const loadRoles = async () => {
      try {
        setError(null)
        const fetchedRoles = await RoleService.getRoles()
        setRoles(fetchedRoles)
      } catch (loadError) {
        setError(loadError)
        setRoles([])
      } finally {
        setIsInitialLoading(false)
      }
    }

    loadRoles()
  }, [enabled])

  const updateRoleLabel = async (roleId: string, label: string) => {
    if (isProtectedRoleId(roleId)) return

    try {
      await persistRole(roleId, (draft) => {
        draft.label = label
      })
    } catch (saveError) {
      toast.error(buildUserFacingErrorMessage(saveError, '角色名称保存失败，请稍后重试'))
    }
  }

  const applyPermissionTreeToggle = async (roleId: string, permissionId: string) => {
    if (isSuperAdminRoleId(roleId)) return

    const role = roles.find((item) => item.id === roleId)
    if (!role) return

    try {
      await persistRole(roleId, (draft) => {
        draft.permissions = buildTreeAssistedPermissionIds(role.permissions, permissionId)
      })
    } catch (saveError) {
      toast.error(buildUserFacingErrorMessage(saveError, '角色权限保存失败，已自动恢复至服务端状态'))
    }
  }

  const updateRolePermissions = async (roleId: string, permissionIds: string[]) => {
    if (isSuperAdminRoleId(roleId)) return

    try {
      await persistRole(roleId, (draft) => {
        draft.permissions = sortPermissionIds(permissionIds)
      })
    } catch (saveError) {
      toast.error(buildUserFacingErrorMessage(saveError, '角色权限保存失败，已自动恢复至服务端状态'))
    }
  }

  const addRole = async (label: string, customId?: string) => {
    const rawId = (customId || '').toString().trim()
    const newRole: Role = {
      id: rawId,
      label,
      color: 'bg-slate-500/10 text-slate-600 border-slate-200',
      permissions: [],
      version: 1,
    }

    setRoles((prev) => [...prev, newRole])

    try {
      await RoleService.upsertRole(newRole)
    } catch (createError) {
      toast.error(buildUserFacingErrorMessage(createError, '账号角色导入失败，请稍后重试'))
      setRoles((prev) => prev.filter((role) => role.id !== newRole.id))
    }
  }

  const deleteRole = async (roleId: string) => {
    setRoles((prev) => prev.filter((role) => role.id !== roleId))

    try {
      await RoleService.deleteRole(roleId)
    } catch (deleteError) {
      toast.error(buildUserFacingErrorMessage(deleteError, '角色删除失败，请刷新后重试'))
    }
  }

  return {
    roles,
    permissions,
    error,
    updateRoleLabel,
    applyPermissionTreeToggle,
    updateRolePermissions,
    addRole,
    deleteRole,
    isInitialLoading,
    isProtectedRoleId,
    isRenamable,
  }
}
