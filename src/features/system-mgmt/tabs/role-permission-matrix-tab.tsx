import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Layers3,
  RefreshCw,
  Save,
  ShieldCheck,
  ShieldPlus,
  Trash2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { getDefaultPermissions } from '@/features/authz/data/default-permission-queries'
import { type Permission } from '@/features/authz/data/permission-schema'
import { useUserOptionsQuery } from '@/features/users/hooks/use-users'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useRoleMutations, useRolesQuery } from '../hooks/use-roles'
import {
  buildPermissionTreeNodes,
  buildTreeAssistedPermissionIds,
  filterPermissionTreeNodesBySelected,
  type PermissionTreeNode,
  sortPermissionIds,
} from '../utils/role-permission-tree'

const ROLE_COLOR_OPTIONS = [
  'bg-slate-500/10 text-slate-600 border-slate-200',
  'bg-blue-500/10 text-blue-600 border-blue-200',
  'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  'bg-amber-500/10 text-amber-600 border-amber-200',
  'bg-rose-500/10 text-rose-600 border-rose-200',
]

function isProtectedRole(roleId: string) {
  return roleId.trim().toLowerCase() === 'admin'
}

function permissionKindLabel(permission: Permission) {
  switch (permission.category) {
    case 'menu':
      return '模块'
    case 'page':
      return '页面'
    case 'tab':
      return '标签'
    default:
      return '操作'
  }
}

function arePermissionIdsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  return left.every((item, index) => item === right[index])
}

function buildRoleDraft(roleId: string, label: string, color: string, permissionIds: string[]) {
  return {
    roleId,
    label,
    color,
    permissionIds: sortPermissionIds(permissionIds),
  }
}

export function RolePermissionMatrixTab() {
  const { t } = useLanguage()
  const defaultPermissions = useMemo(() => getDefaultPermissions(), [])
  const permissionTree = useMemo(() => buildPermissionTreeNodes(defaultPermissions), [defaultPermissions])
  const { data: roles = [], isLoading, error, refetch } = useRolesQuery()
  const { data: userOptions = [] } = useUserOptionsQuery({})
  const { upsertRoleMutation, deleteRoleMutation } = useRoleMutations()

  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [roleSearch, setRoleSearch] = useState('')
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [draftState, setDraftState] = useState<{
    roleId: string
    label: string
    color: string
    permissionIds: string[]
  } | null>(null)
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[] | null>(null)
  const [newRoleId, setNewRoleId] = useState('')
  const [newRoleLabel, setNewRoleLabel] = useState('')
  const [newRoleColor, setNewRoleColor] = useState(ROLE_COLOR_OPTIONS[1])
  const [pendingDeleteRoleId, setPendingDeleteRoleId] = useState('')

  const allExpandedModuleIds = useMemo(
    () => permissionTree.map((node) => node.module.id),
    [permissionTree],
  )

  const effectiveExpandedModuleIds = expandedModuleIds ?? allExpandedModuleIds

  const effectiveSelectedRoleId = useMemo(() => {
    if (selectedRoleId && roles.some((role) => role.id === selectedRoleId)) {
      return selectedRoleId
    }
    return roles[0]?.id || ''
  }, [roles, selectedRoleId])

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === effectiveSelectedRoleId) ?? null,
    [effectiveSelectedRoleId, roles],
  )

  const effectiveDraftState = useMemo(() => {
    if (!selectedRole) {
      return buildRoleDraft('', '', ROLE_COLOR_OPTIONS[0], [])
    }

    if (draftState && draftState.roleId === selectedRole.id) {
      return draftState
    }

    return buildRoleDraft(
      selectedRole.id,
      selectedRole.label,
      selectedRole.color || ROLE_COLOR_OPTIONS[0],
      selectedRole.permissions || [],
    )
  }, [draftState, selectedRole])

  const draftLabel = effectiveDraftState.label
  const draftColor = effectiveDraftState.color
  const draftPermissionIds = effectiveDraftState.permissionIds

  const selectedPermissionIDSet = useMemo(
    () => new Set(draftPermissionIds.map((item) => item.trim().toLowerCase())),
    [draftPermissionIds],
  )

  const filteredRoles = useMemo(() => {
    const keyword = roleSearch.trim().toLowerCase()
    if (!keyword) return roles
    return roles.filter((role) => {
      const label = (role.label || '').trim().toLowerCase()
      const roleId = role.id.trim().toLowerCase()
      return label.includes(keyword) || roleId.includes(keyword)
    })
  }, [roleSearch, roles])

  const visiblePermissionTree = useMemo(() => {
    if (!showSelectedOnly) return permissionTree
    return filterPermissionTreeNodesBySelected(permissionTree, selectedPermissionIDSet)
  }, [permissionTree, selectedPermissionIDSet, showSelectedOnly])

  const boundUsers = useMemo(() => {
    if (!selectedRole) return []
    return userOptions.filter((user) => (user.role || '').trim().toLowerCase() === selectedRole.id.trim().toLowerCase())
  }, [selectedRole, userOptions])

  const hasDraftChanges = useMemo(() => {
    if (!selectedRole) return false
    return (
      draftLabel.trim() !== (selectedRole.label || '').trim() ||
      draftColor !== (selectedRole.color || ROLE_COLOR_OPTIONS[0]) ||
      !arePermissionIdsEqual(sortPermissionIds(draftPermissionIds), sortPermissionIds(selectedRole.permissions || []))
    )
  }, [draftColor, draftLabel, draftPermissionIds, selectedRole])

  const dirtyStatusText = isProtectedRole(selectedRole?.id || '')
    ? '系统模板已锁定'
    : hasDraftChanges
      ? '存在未保存改动'
      : '矩阵已同步'

  const dirtyStatusToneClass = isProtectedRole(selectedRole?.id || '')
    ? 'bg-amber-500/10 text-amber-600 border-amber-200'
    : hasDraftChanges
      ? 'bg-rose-500/10 text-rose-600 border-rose-200'
      : 'bg-emerald-500/10 text-emerald-600 border-emerald-200'

  if (isForbiddenError(error)) {
    return <ForbiddenState fullHeight={false} />
  }

  if (error) {
    return <div className='text-destructive'>{String((error as Error).message || '加载角色权限矩阵失败')}</div>
  }

  const updateDraftState = (
    updater: (current: { roleId: string; label: string; color: string; permissionIds: string[] }) => {
      roleId: string
      label: string
      color: string
      permissionIds: string[]
    },
  ) => {
    const fallbackRoleID = selectedRole?.id || effectiveSelectedRoleId
    const fallbackLabel = selectedRole?.label || ''
    const fallbackColor = selectedRole?.color || ROLE_COLOR_OPTIONS[0]
    const fallbackPermissions = selectedRole?.permissions || []

    setDraftState((current) => {
      const base = current && current.roleId === fallbackRoleID
        ? current
        : buildRoleDraft(fallbackRoleID, fallbackLabel, fallbackColor, fallbackPermissions)
      return updater(base)
    })
  }

  const handleTogglePermission = (permissionId: string) => {
    if (!selectedRole || isProtectedRole(selectedRole.id)) return
    updateDraftState((current) => ({
      ...current,
      permissionIds: buildTreeAssistedPermissionIds(current.permissionIds, permissionId),
    }))
  }

  const handleSave = async () => {
    if (!selectedRole || isProtectedRole(selectedRole.id)) return

    await upsertRoleMutation.mutateAsync({
      id: selectedRole.id,
      label: draftLabel.trim() || selectedRole.id,
      color: draftColor,
      permissions: sortPermissionIds(draftPermissionIds),
    })
    setDraftState(null)
    toast.success('角色权限矩阵已保存')
  }

  const handleCreateRole = async () => {
    const normalizedRoleId = newRoleId.trim().toLowerCase()
    if (!normalizedRoleId) {
      toast.error('角色编码不能为空')
      return
    }

    await upsertRoleMutation.mutateAsync({
      id: normalizedRoleId,
      label: newRoleLabel.trim() || normalizedRoleId,
      color: newRoleColor,
      permissions: [],
    })
    setSelectedRoleId(normalizedRoleId)
    setDraftState(null)
    setNewRoleId('')
    setNewRoleLabel('')
    setNewRoleColor(ROLE_COLOR_OPTIONS[1])
    toast.success('角色已创建')
  }

  const handleDeleteRole = async () => {
    if (!pendingDeleteRoleId) return
    await deleteRoleMutation.mutateAsync(pendingDeleteRoleId)
    setPendingDeleteRoleId('')
    setDraftState(null)
    if (selectedRoleId === pendingDeleteRoleId) {
      const nextRole = roles.find((role) => role.id !== pendingDeleteRoleId)
      setSelectedRoleId(nextRole?.id || '')
    }
    toast.success('角色已删除')
  }

  const toggleModule = (moduleId: string) => {
    setExpandedModuleIds((current) =>
      (current ?? allExpandedModuleIds).includes(moduleId)
        ? (current ?? allExpandedModuleIds).filter((item) => item !== moduleId)
        : [...(current ?? allExpandedModuleIds), moduleId],
    )
  }

  const renderPermissionRow = (permission: Permission, depth: number) => {
    const checked = selectedPermissionIDSet.has(permission.id.toLowerCase())

    return (
      <div
        key={permission.id}
        className='grid grid-cols-[auto,1fr,auto] items-start gap-3 rounded-2xl border border-dashed border-muted/40 bg-background/80 px-3 py-3'
      >
        <div className='pt-0.5' style={{ marginLeft: `${depth * 18}px` }}>
          <Checkbox
            checked={checked}
            disabled={!selectedRole || isProtectedRole(selectedRole.id)}
            onCheckedChange={() => handleTogglePermission(permission.id)}
          />
        </div>
        <div className='min-w-0'>
          <div className='text-sm font-black tracking-tight'>{permission.label}</div>
          <div className='mt-1 text-[8px] font-mono uppercase opacity-60'>{permission.id}</div>
          <div className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
            {permission.desc || permission.path || 'NO_DESCRIPTION'}
          </div>
        </div>
        <span className='rounded-full border border-dashed border-muted/50 bg-muted/40 px-2 py-1 text-[8px] font-mono uppercase'>
          {permissionKindLabel(permission)}
        </span>
      </div>
    )
  }

  const renderModuleBlock = (node: PermissionTreeNode) => {
    const expanded = effectiveExpandedModuleIds.includes(node.module.id)
    const moduleChecked = selectedPermissionIDSet.has(node.module.id.toLowerCase())

    return (
      <div key={node.module.id} className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='flex min-w-0 items-start gap-3'>
            <Checkbox
              checked={moduleChecked}
              disabled={!selectedRole || isProtectedRole(selectedRole.id)}
              onCheckedChange={() => handleTogglePermission(node.module.id)}
            />
            <div className='min-w-0'>
              <div className='text-sm font-black italic tracking-tighter'>{node.module.label}</div>
              <div className='mt-1 text-[8px] font-mono uppercase opacity-60'>{node.module.id}</div>
              <div className='mt-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                {expanded
                  ? t('systemManagement.userRights.status.expanded', { count: node.childNodeCount })
                  : t('systemManagement.userRights.status.collapsedShort', { count: node.childNodeCount })}
              </div>
            </div>
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='rounded-full border-dashed text-[10px] font-black uppercase tracking-widest'
            onClick={() => toggleModule(node.module.id)}
          >
            {expanded ? t('systemManagement.userRights.actions.collapse') : t('systemManagement.userRights.actions.expand')}
          </Button>
        </div>

        {expanded ? (
          <div className='mt-4 grid gap-3'>
            {node.pages.map((pageNode) => (
              <div key={pageNode.page.id} className='grid gap-3'>
                {renderPermissionRow(pageNode.page, 1)}
                {pageNode.tabs.map((tab) => renderPermissionRow(tab, 2))}
              </div>
            ))}
            {node.directTabs.map((tab) => renderPermissionRow(tab, 1))}
            {node.directActions.map((action) => renderPermissionRow(action, 1))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6 relative overflow-hidden'>
          <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
          <div className='relative flex flex-col gap-2'>
            <div className='flex items-center gap-2 text-primary'>
              <ShieldCheck className='size-4' />
              <h1 className='text-lg font-black tracking-tighter italic uppercase'>
                {t('systemManagement.userRights.header.title')}
              </h1>
            </div>
            <p className='text-[9px] font-black uppercase tracking-widest opacity-60'>
              {t('systemManagement.userRights.header.subtitle')}
            </p>
          </div>
        </div>

        <div className='grid gap-4 lg:grid-cols-3'>
          <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>角色总数</div>
                <div className='mt-2 text-3xl font-black tracking-tighter'>{roles.length}</div>
              </div>
              <Layers3 className='size-4 text-primary/60' />
            </div>
          </div>
          <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>所选权限数</div>
                <div className='mt-2 text-3xl font-black tracking-tighter'>{draftPermissionIds.length}</div>
              </div>
              <ShieldPlus className='size-4 text-emerald-600/70' />
            </div>
          </div>
          <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
            <div className='flex items-center justify-between gap-3'>
              <div>
                <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>绑定账号数</div>
                <div className='mt-2 text-3xl font-black tracking-tighter'>{boundUsers.length}</div>
              </div>
              <Users className='size-4 text-amber-600/70' />
            </div>
          </div>
        </div>

        <div className='grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
          <div className='flex flex-col gap-4'>
            <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
              <div className='text-sm font-black italic tracking-tighter'>新增角色</div>
              <div className='mt-4 grid gap-3'>
                <Input
                  value={newRoleId}
                  onChange={(event) => setNewRoleId(event.target.value)}
                  placeholder='role_finance_manager'
                  className='h-12 rounded-2xl border-none bg-muted/50 text-xs font-bold'
                />
                <Input
                  value={newRoleLabel}
                  onChange={(event) => setNewRoleLabel(event.target.value)}
                  placeholder='财务经理'
                  className='h-12 rounded-2xl border-none bg-muted/50 text-xs font-bold'
                />
                <Select value={newRoleColor} onValueChange={setNewRoleColor}>
                  <SelectTrigger className='h-12 w-full rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold'>
                    <SelectValue placeholder='选择色板' />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color} value={color}>{color}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type='button'
                  onClick={() => void handleCreateRole()}
                  disabled={upsertRoleMutation.isPending}
                  className='h-11 rounded-full font-black text-[10px] uppercase tracking-widest'
                >
                  {t('systemManagement.userRights.actions.confirmImport')}
                </Button>
              </div>
            </div>

            <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
              <div className='flex items-center justify-between gap-2'>
                <div>
                  <div className='text-sm font-black italic tracking-tighter'>{t('systemManagement.userRights.mobile.targetRole')}</div>
                  <div className='mt-1 text-[9px] font-black uppercase tracking-widest opacity-60'>ROLE_SELECTOR</div>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='rounded-full border-dashed text-[10px] font-black uppercase tracking-widest'
                  onClick={() => void refetch()}
                >
                  <RefreshCw className='mr-2 size-3.5' />
                  刷新
                </Button>
              </div>
              <div className='mt-4 grid gap-3'>
                <Input
                  value={roleSearch}
                  onChange={(event) => setRoleSearch(event.target.value)}
                  placeholder='搜索角色编码或名称'
                  className='h-12 rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold'
                />
                <div className='flex items-center justify-between rounded-[20px] border border-dashed border-muted/50 bg-background/70 px-4 py-3'>
                  <div>
                    <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>筛选结果</div>
                    <div className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      当前显示 {filteredRoles.length} / {roles.length} 个角色
                    </div>
                  </div>
                  <span className='rounded-full border border-dashed border-muted/50 bg-muted/40 px-2 py-1 text-[8px] font-mono uppercase'>
                    SEARCH
                  </span>
                </div>
              </div>
              <ScrollArea className='mt-4 h-[420px]'>
                <div className='grid gap-2 pr-3'>
                  {filteredRoles.map((role) => {
                    const active = role.id === effectiveSelectedRoleId
                    const protectedRole = isProtectedRole(role.id)
                    const usersCount = userOptions.filter((user) => (user.role || '').trim().toLowerCase() === role.id.toLowerCase()).length

                    return (
                      <button
                        key={role.id}
                        type='button'
                        onClick={() => {
                          setSelectedRoleId(role.id)
                          setDraftState(null)
                        }}
                        className={cn(
                          'rounded-[20px] border border-dashed p-3 text-left transition-all',
                          active ? 'border-primary bg-primary/5' : 'border-muted/50 bg-background/70 hover:bg-muted/30',
                        )}
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <div className='text-sm font-black italic tracking-tighter'>{role.label || role.id}</div>
                            <div className='mt-1 text-[8px] font-mono uppercase opacity-60'>{role.id}</div>
                          </div>
                          <span className={cn('rounded-full border px-2 py-1 text-[8px] font-mono', role.color || ROLE_COLOR_OPTIONS[0])}>
                            {protectedRole ? 'LOCKED' : `${usersCount} USERS`}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                  {!isLoading && roles.length === 0 ? (
                    <div className='rounded-[20px] border border-dashed border-muted/50 bg-background/70 px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      暂无角色，请先创建。
                    </div>
                  ) : null}
                  {!isLoading && roles.length > 0 && filteredRoles.length === 0 ? (
                    <div className='rounded-[20px] border border-dashed border-muted/50 bg-background/70 px-4 py-6 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      未找到匹配角色。
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className='flex min-w-0 flex-col gap-4'>
            <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
              <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]'>
                <div className='grid gap-3'>
                  <div>
                    <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>角色标签</div>
                    <Input
                      value={draftLabel}
                      onChange={(event) => updateDraftState((current) => ({ ...current, label: event.target.value }))}
                      disabled={!selectedRole || isProtectedRole(selectedRole.id)}
                      placeholder='请选择或创建角色'
                      className='mt-2 h-12 rounded-2xl border-none bg-muted/50 text-xs font-bold'
                    />
                  </div>
                  <div>
                    <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>色板</div>
                    <Select
                      value={draftColor}
                      onValueChange={(value) => updateDraftState((current) => ({ ...current, color: value }))}
                      disabled={!selectedRole || isProtectedRole(selectedRole.id)}
                    >
                      <SelectTrigger className='mt-2 h-12 w-full rounded-2xl border-none bg-muted/50 px-4 text-xs font-bold'>
                        <SelectValue placeholder='选择色板' />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_COLOR_OPTIONS.map((color) => (
                          <SelectItem key={color} value={color}>{color}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className='rounded-[20px] border border-dashed border-muted/50 bg-background/70 p-4'>
                  <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>矩阵状态</div>
                  <div className='mt-3 text-sm font-black italic tracking-tighter'>
                    {selectedRole ? (selectedRole.label || selectedRole.id) : '未选择角色'}
                  </div>
                  <div className='mt-2 text-[8px] font-mono uppercase opacity-60'>
                    {selectedRole ? selectedRole.id : 'NO_ROLE_SELECTED'}
                  </div>
                  <div className='mt-3'>
                    <span className={cn('rounded-full border px-2.5 py-1 text-[8px] font-mono uppercase', dirtyStatusToneClass)}>
                      {dirtyStatusText}
                    </span>
                  </div>
                  <div className='mt-4 space-y-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                    <div>绑定账号: {boundUsers.length}</div>
                    <div>权限节点: {draftPermissionIds.length}</div>
                    <div>{dirtyStatusText}</div>
                  </div>
                </div>
              </div>

              <div className='mt-4 flex flex-wrap gap-3'>
                <Button
                  type='button'
                  onClick={() => void handleSave()}
                  disabled={!selectedRole || !hasDraftChanges || upsertRoleMutation.isPending || isProtectedRole(selectedRole.id)}
                  className='h-11 rounded-full font-black text-[10px] uppercase tracking-widest'
                >
                  <Save className='mr-2 size-3.5' />
                  保存矩阵
                </Button>
                <Button
                  type='button'
                  variant={showSelectedOnly ? 'default' : 'outline'}
                  onClick={() => setShowSelectedOnly((current) => !current)}
                  className='h-11 rounded-full border-dashed font-black text-[10px] uppercase tracking-widest'
                >
                  {showSelectedOnly ? '查看全部权限' : '只看已选权限'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => selectedRole && setPendingDeleteRoleId(selectedRole.id)}
                  disabled={!selectedRole || isProtectedRole(selectedRole.id) || deleteRoleMutation.isPending}
                  className='h-11 rounded-full border-dashed font-black text-[10px] uppercase tracking-widest text-rose-600'
                >
                  <Trash2 className='mr-2 size-3.5' />
                  删除角色
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setExpandedModuleIds(allExpandedModuleIds)}
                  className='h-11 rounded-full border-dashed font-black text-[10px] uppercase tracking-widest'
                >
                  {t('systemManagement.userRights.actions.expandAll')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setExpandedModuleIds([])}
                  className='h-11 rounded-full border-dashed font-black text-[10px] uppercase tracking-widest'
                >
                  {t('systemManagement.userRights.actions.collapseAll')}
                </Button>
              </div>

              <div className='mt-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                {t('systemManagement.userRights.securityInfo')}
              </div>
            </div>

            <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
              <div className='mb-4 flex items-center gap-2'>
                <ShieldCheck className='size-4 text-primary' />
                <div className='text-sm font-black italic tracking-tighter'>
                  {t('systemManagement.userRights.sections.accessTree')}
                </div>
              </div>
              <div className='mb-4 flex flex-wrap items-center gap-3 rounded-[20px] border border-dashed border-muted/50 bg-background/70 px-4 py-3'>
                <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>当前视图</span>
                <span className='rounded-full border border-dashed border-muted/50 bg-muted/40 px-2 py-1 text-[8px] font-mono uppercase'>
                  {showSelectedOnly ? `SELECTED ${visiblePermissionTree.length} MODULES` : `FULL ${visiblePermissionTree.length} MODULES`}
                </span>
                {hasDraftChanges ? (
                  <span className='rounded-full border border-rose-200 bg-rose-500/10 px-2 py-1 text-[8px] font-mono uppercase text-rose-600'>
                    UNSAVED
                  </span>
                ) : null}
              </div>
              <ScrollArea className='h-[720px]'>
                <div className='grid gap-4 pr-3'>
                  {visiblePermissionTree.map((node) => renderModuleBlock(node))}
                  {visiblePermissionTree.length === 0 ? (
                    <div className='rounded-[20px] border border-dashed border-muted/50 bg-background/70 px-4 py-10 text-center'>
                      <div className='text-sm font-black italic tracking-tighter'>暂无可显示的权限节点</div>
                      <div className='mt-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                        当前角色在“只看已选权限”模式下没有匹配节点。
                      </div>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={pendingDeleteRoleId.length > 0} onOpenChange={(open) => !open && setPendingDeleteRoleId('')}>
        <AlertDialogContent className='rounded-[32px] border-none shadow-2xl'>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-lg font-black tracking-tighter italic uppercase'>删除角色</AlertDialogTitle>
            <AlertDialogDescription className='text-[10px] font-black uppercase tracking-widest opacity-60'>
              删除后，绑定该角色的账户会失去角色权限，只保留显式权限。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='rounded-full h-11 font-black text-[10px] uppercase tracking-widest'>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteRole()}
              className='rounded-full h-11 bg-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-700'
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
