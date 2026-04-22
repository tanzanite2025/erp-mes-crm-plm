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

function isProtectedRoleId(roleId: string, currentUserRoles: string[] = []): boolean {
  const normalized = roleId.trim().toLowerCase()
  const isSysAdmin = currentUserRoles.some((role) => role === 'admin' || role === 'superadmin')

  if (normalized === 'admin' || normalized === 'superadmin') return true
  if (normalized.startsWith('org_')) return !isSysAdmin

  return false
}

function isRenamable(roleId: string): boolean {
  const normalized = roleId.trim().toLowerCase()
  return normalized !== 'admin' && normalized !== 'superadmin' && !normalized.startsWith('org_')
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
    const role = roles.find((item) => item.id === roleId)
    if (!role) return
    if (isProtectedRoleId(role.id)) return

    const tracker = trackDelta(role)
    const draft = tracker.data as Role
    draft.label = label
    const delta = tracker.commit()

    if (Object.keys(delta).length === 0) return

    try {
      const result = await RoleService.patchRole(roleId, delta, role.version)
      setRoles((prev) => prev.map((item) => (item.id === roleId ? result : item)))
    } catch (saveError) {
      toast.error(buildUserFacingErrorMessage(saveError, '角色名称保存失败，请稍后重试'))
    }
  }

  const applyPermissionTreeToggle = async (roleId: string, permissionId: string) => {
    const role = roles.find((item) => item.id === roleId)
    if (!role) return
    if (isSuperAdminRoleId(role.id)) return

    const tracker = trackDelta(role)
    const draft = tracker.data as Role
    draft.permissions = buildTreeAssistedPermissionIds(role.permissions, permissionId)
    const delta = tracker.commit()

    if (Object.keys(delta).length === 0) return

    try {
      const result = await RoleService.patchRole(roleId, delta, role.version)
      setRoles((prev) => prev.map((item) => (item.id === roleId ? result : item)))
    } catch (saveError) {
      toast.error(buildUserFacingErrorMessage(saveError, '角色权限保存失败，已自动恢复至服务端状态'))
    }
  }

  const updateRolePermissions = async (roleId: string, permissionIds: string[]) => {
    const role = roles.find((item) => item.id === roleId)
    if (!role) return
    if (isSuperAdminRoleId(role.id)) return

    const tracker = trackDelta(role)
    const draft = tracker.data as Role
    draft.permissions = sortPermissionIds(permissionIds)
    const delta = tracker.commit()

    if (Object.keys(delta).length === 0) return

    try {
      const result = await RoleService.patchRole(roleId, delta, role.version)
      setRoles((prev) => prev.map((item) => (item.id === roleId ? result : item)))
    } catch (saveError) {
      toast.error(buildUserFacingErrorMessage(saveError, '角色权限保存失败，已自动恢复至服务端状态'))
    }
  }

  const addRole = async (label: string, customId?: string) => {
    const rawId = (customId || '').toString().trim().toLowerCase()
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
