import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { OrgService } from '@/features/org-personnel/services/org-service'
import * as userApi from '@/features/users/services/user-api'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { toast } from 'sonner'
import { UserRightsDesktopMatrix } from './components/user-rights-desktop-matrix'
import { UserRightsHeader } from './components/user-rights-header'
import { UserRightsMobileTree } from './components/user-rights-mobile-tree'
import { UserRightsRoleSelector } from './components/user-rights-role-selector'
import { flattenOrgRoleOptions, formatPermissionLabel, buildPermissionTree } from './components/user-rights-utils'
import type { OrgRoleOption } from './components/user-rights-types'
import { useRoles } from '../hooks/use-roles'

type UserRoleCarrier = {
  resolvedRole?: string
  role?: string
}

export function UserRights() {
  const { t, locale } = useLanguage()
  const {
    roles,
    permissions,
    error,
    updateRoleLabel,
    applyPermissionTreeToggle,
    addRole,
    deleteRole,
    isRenamable,
  } = useRoles()
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string>('admin')
  const [tempLabel, setTempLabel] = useState('')
  const [isAddingMode, setIsAddingMode] = useState(false)
  const [newRoleId, setNewRoleId] = useState('')
  const [orgNodes, setOrgNodes] = useState<OrgRoleOption[]>([])
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

  useEffect(() => {
    const loadOrgData = async () => {
      // 并行获取全量账户列表与组织树，实现“账户驱动”的权限导入
      const [usersResponse, nodes] = await Promise.all([
        userApi.fetchUsers({ pageSize: 1000 }),
        OrgService.getOrgTree(),
      ])

      const userList: UserRoleCarrier[] = usersResponse.items ?? []

      // 提取账户中实际使用的角色 ID (增强兼容性)
      const usedRoleIdsFromAccounts = new Set<string>()
      userList.forEach((u) => {
        const rawRole = (u.resolvedRole || u.role || '').trim()
        if (rawRole) {
          usedRoleIdsFromAccounts.add(rawRole.toLowerCase())
        }
      })

      // 找出当前系统中已有的角色 ID
      const existingRoleIds = new Set(roles.map((r) => r.id.trim().toLowerCase()))

      // 生成全量组织选项，并传入活跃账号引用信息以供视觉提示
      const allOptions = nodes?.length
        ? flattenOrgRoleOptions(nodes, Array.from(existingRoleIds), usedRoleIdsFromAccounts)
        : []

      setOrgNodes(allOptions)
    }

    if (isAddingMode) loadOrgData()
  }, [isAddingMode, roles])

  const currentRole = roles.find((role) => role.id === selectedRoleId)
  const selectedOrgRoleOption = orgNodes.find((option) => option.value === newRoleId)
  const pendingDeleteRole = roles.find((role) => role.id === pendingDeleteRoleId) || null
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

  const saveLabel = (roleId: string) => {
    if (!isRenamable(roleId)) {
      setEditingRoleId(null)
      return
    }
    if (tempLabel.trim()) updateRoleLabel(roleId, tempLabel.trim())
    setEditingRoleId(null)
  }

  const handleAddRole = () => {
    if (!newRoleId) return
    const [id, label] = newRoleId.split('|')
    if (!id || !label) return
    if (roles.some((role) => role.id.trim().toLowerCase() === id.trim().toLowerCase())) {
      toast.error(
        locale === 'zh-CN'
          ? `部门角色“${label}”已导入，请直接修改现有角色矩阵。`
          : `Department role "${label}" is already imported.`,
      )
      setIsAddingMode(false)
      setNewRoleId('')
      return
    }
    addRole(label, id)
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
    ? pendingDeleteRole.id.trim().toLowerCase().startsWith('org_')
      ? locale === 'zh-CN'
        ? `即将删除部门角色“${pendingDeleteRole.label}”。删除后，该部门账号会失去对应访问范围，相关员工登录后可能无法进入原有页面。请先确认该部门已经切换到新的角色标识。`
        : `You are deleting department role "${pendingDeleteRole.label}". After deletion, accounts in that department will lose the mapped access scope and may no longer access their current pages. Confirm the department has been reassigned first.`
      : locale === 'zh-CN'
        ? `即将删除角色“${pendingDeleteRole.label}”。删除后，引用该角色的账号将失去对应权限。`
        : `You are deleting role "${pendingDeleteRole.label}". Accounts referencing this role will lose the mapped permissions.`
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
            orgNodes={orgNodes}
            isConfirmDisabled={!newRoleId || Boolean(selectedOrgRoleOption?.disabled)}
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

      <UserRightsDesktopMatrix
        roles={roles}
        permissionTree={permissionTree}
        rootActionPermissions={rootActionPermissions}
        editingRoleId={editingRoleId}
        tempLabel={tempLabel}
        expandedModuleIds={expandedModuleIds}
        formatPermissionLabel={formatPermissionLabel}
        isRenamable={isRenamable}
        canDeleteRoles={canDeleteRoles}
        onTempLabelChange={setTempLabel}
        onStartEditing={(roleId, label) => {
          if (!isRenamable(roleId)) return
          setEditingRoleId(roleId)
          setTempLabel(label)
        }}
        onSaveLabel={saveLabel}
        onDeleteRole={setPendingDeleteRoleId}
        onApplyPermissionTreeToggle={applyPermissionTreeToggle}
        onToggleModuleExpanded={toggleModuleExpanded}
        onExpandAll={() => setExpandedModuleIds(permissionTree.map(({ module }) => module.id))}
        onCollapseAll={() => setExpandedModuleIds([])}
      />

      <UserRightsMobileTree
        selectedRoleId={selectedRoleId}
        currentRole={currentRole}
        isMobileSuperRole={canDeleteRoles}
        permissionTree={permissionTree}
        rootActionPermissions={rootActionPermissions}
        expandedModuleIds={expandedModuleIds}
        formatPermissionLabel={formatPermissionLabel}
        onApplyPermissionTreeToggle={applyPermissionTreeToggle}
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
