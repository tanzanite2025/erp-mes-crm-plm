import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { useUserOptionsQuery } from '@/features/users/hooks/use-users'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { toast } from 'sonner'
import { UserRightsHeader } from './components/user-rights-header'
import { UserRightsPermissionPanel } from './components/user-rights-permission-panel'
import { UserRightsRoleSelector } from './components/user-rights-role-selector'
import { buildAccountRoleOptions, formatPermissionLabel, buildPermissionTree } from './components/user-rights-utils'
import { useRoles } from '../hooks/use-roles'

export function UserRights() {
  const { t, locale } = useLanguage()
  const {
    roles,
    permissions,
    error,
    updateRolePermissions,
    addRole,
    deleteRole,
  } = useRoles()
  const userOptionsQuery = useUserOptionsQuery({ status: ['active'] })
  const [selectedRoleId, setSelectedRoleId] = useState<string>('admin')
  const [isAddingMode, setIsAddingMode] = useState(false)
  const [newRoleId, setNewRoleId] = useState('')
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([])
  const [pendingDeleteRoleId, setPendingDeleteRoleId] = useState<string | null>(null)
  const canDeleteRoles = true

  useEffect(() => {
    if (roles.length > 0 && !roles.some((role) => role.id === selectedRoleId)) {
      const timer = globalThis.setTimeout(() => {
        setSelectedRoleId(roles[0].id)
      }, 0)

      return () => {
        globalThis.clearTimeout(timer)
      }
    }
  }, [roles, selectedRoleId])

  const currentRole = roles.find((role) => role.id === selectedRoleId)
  const pendingDeleteRole = roles.find((role) => role.id === pendingDeleteRoleId) || null
  const roleOptions = useMemo(
    () => buildAccountRoleOptions(userOptionsQuery.data ?? [], roles.map((role) => role.id)),
    [roles, userOptionsQuery.data],
  )
  const selectedRoleOption = roleOptions.find((option) => option.value === newRoleId)
  const sortedPermissions = useMemo(
    () => [...permissions].sort((a, b) => (a.path || a.label).localeCompare(b.path || b.label)),
    [permissions],
  )
  const rootActionPermissions = useMemo(
    () => sortedPermissions.filter((permission) => permission.category === 'action' && !permission.parentId),
    [sortedPermissions],
  )
  const permissionTree = useMemo(() => buildPermissionTree(sortedPermissions), [sortedPermissions])

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setExpandedModuleIds((prev) =>
        prev.filter((moduleId) => permissionTree.some(({ module }) => module.id === moduleId)),
      )
    }, 0)

    return () => {
      globalThis.clearTimeout(timer)
    }
  }, [permissionTree])

  const handleAddRole = () => {
    const normalizedRoleId = newRoleId.trim()
    if (!normalizedRoleId) return

    if (roles.some((role) => role.id.trim().toLowerCase() === normalizedRoleId.toLowerCase())) {
      toast.error(
        locale === 'zh-CN'
          ? `账号角色“${normalizedRoleId}”已导入，请直接修改现有角色权限。`
          : `Account role "${normalizedRoleId}" is already imported.`,
      )
      setIsAddingMode(false)
      setNewRoleId('')
      return
    }
    addRole(normalizedRoleId, normalizedRoleId)
    setNewRoleId('')
    setIsAddingMode(false)
  }

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModuleIds((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId],
    )
  }

  const handleConfirmDeleteRole = async () => {
    if (!pendingDeleteRole) return
    await deleteRole(pendingDeleteRole.id)
    setPendingDeleteRoleId(null)
  }

  const deleteRoleDialogTitle = locale === 'zh-CN' ? '删除角色确认' : 'Confirm Role Deletion'
  const deleteRoleDialogDesc = pendingDeleteRole
    ? locale === 'zh-CN'
      ? `即将删除角色“${pendingDeleteRole.label}”。删除后，引用该角色的账号将失去对应权限。请先确认这些账号已经切换到新的角色标识。`
      : `You are deleting role "${pendingDeleteRole.label}". Accounts referencing this role will lose the mapped permissions. Confirm those accounts have been reassigned first.`
    : ''

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-8 relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
        <div className='flex items-center justify-between relative z-10'>
          <div className='flex items-center gap-3'>
            <div className='size-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner'>
              <ShieldCheck className='size-5 text-primary' />
            </div>
            <div>
              <h2 className='text-xl font-black uppercase italic tracking-tighter'>权限控制中心 / ACCESS_CONTROL_MATRIX</h2>
              <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60'>
                管理系统角色、权限条目及多维权限矩阵
              </span>
            </div>
          </div>
          <UserRightsHeader
            isAddingMode={isAddingMode}
            newRoleId={newRoleId}
            roleOptions={roleOptions}
            isConfirmDisabled={!newRoleId || Boolean(selectedRoleOption?.disabled)}
            onNewRoleChange={setNewRoleId}
            onStartAdd={() => setIsAddingMode(true)}
            onConfirmAdd={handleAddRole}
            onCancelAdd={() => setIsAddingMode(false)}
          />
        </div>
      </div>

      <UserRightsRoleSelector
        roles={roles}
        selectedRoleId={selectedRoleId}
        onSelectRole={setSelectedRoleId}
      />

      <UserRightsPermissionPanel
        currentRole={currentRole}
        permissionTree={permissionTree}
        rootActionPermissions={rootActionPermissions}
        expandedModuleIds={expandedModuleIds}
        formatPermissionLabel={formatPermissionLabel}
        canDeleteRoles={canDeleteRoles}
        onDeleteRole={setPendingDeleteRoleId}
        onSavePermissions={updateRolePermissions}
        onToggleModuleExpanded={toggleModuleExpanded}
        onExpandAll={() => setExpandedModuleIds(permissionTree.map(({ module }) => module.id))}
        onCollapseAll={() => setExpandedModuleIds([])}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteRole)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteRoleId(null)
        }}
        title={deleteRoleDialogTitle}
        desc={deleteRoleDialogDesc}
        confirmText={locale === 'zh-CN' ? '确认删除' : 'Delete Role'}
        cancelBtnText={locale === 'zh-CN' ? '取消' : 'Cancel'}
        destructive
        handleConfirm={() => {
          void handleConfirmDeleteRole()
        }}
      />

      <div className='p-4 sm:p-6 rounded-2xl bg-muted/5 border border-dashed border-muted/50 flex items-start gap-3'>
        <div className='size-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] mt-1 animate-pulse shrink-0' />
        <p className='text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 leading-relaxed'>
          {t('systemManagement.userRights.securityInfo')}
        </p>
      </div>
    </div>
  )
}
