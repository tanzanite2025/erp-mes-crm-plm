import { useMemo, useState } from 'react'
import { ChevronRight, Pencil, Search, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { buildTreeAssistedPermissionIds } from '../../utils/role-permission-tree'
import type {
  PermissionLabelFormatter,
  PermissionTreeNode,
  UserRightsPermission,
  UserRightsRole,
} from './user-rights-types'

type UserRightsPermissionPanelProps = {
  currentRole?: UserRightsRole
  permissionTree: PermissionTreeNode[]
  rootActionPermissions: UserRightsPermission[]
  expandedModuleIds: string[]
  formatPermissionLabel: PermissionLabelFormatter
  canDeleteRoles: boolean
  onDeleteRole: (roleId: string) => void
  onSavePermissions: (roleId: string, permissionIds: string[]) => void
  onToggleModuleExpanded: (moduleId: string) => void
  onExpandAll: () => void
  onCollapseAll: () => void
}

type FlatPermissionItem = {
  permission: UserRightsPermission
  depth: number
  section: 'access' | 'action'
  moduleId: string
  parentModuleId?: string
}

type PermissionVisibilityFilter = 'all' | 'selected' | 'unselected'

const ALL_MODULES_VALUE = '__all_modules__'
const ROOT_ACTIONS_VALUE = '__root_actions__'

const visibilityFilterOptions: { value: PermissionVisibilityFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'selected', label: '已选' },
  { value: 'unselected', label: '未选' },
]

function getPermissionCategoryLabel(category: UserRightsPermission['category']) {
  if (category === 'action') return '操作'
  if (category === 'menu') return '模块'
  if (category === 'page') return '页面'
  if (category === 'tab') return 'TAB'
  return category
}

function isSystemRole(role?: UserRightsRole) {
  const normalized = role?.id.trim().toLowerCase()
  return normalized === 'admin' || normalized === 'superadmin'
}

function flattenPermissions(
  permissionTree: PermissionTreeNode[],
  rootActionPermissions: UserRightsPermission[],
): FlatPermissionItem[] {
  const items: FlatPermissionItem[] = []

  permissionTree.forEach(({ module, pages, directTabs, directActions }) => {
    items.push({ permission: module, depth: 0, section: 'access', moduleId: module.id })
    pages.forEach(({ page, tabs }) => {
      items.push({ permission: page, depth: 1, section: 'access', moduleId: module.id, parentModuleId: module.id })
      tabs.forEach((tab) => {
        items.push({ permission: tab, depth: 2, section: 'access', moduleId: module.id, parentModuleId: module.id })
      })
    })
    directTabs.forEach((tab) => {
      items.push({ permission: tab, depth: 1, section: 'access', moduleId: module.id, parentModuleId: module.id })
    })
    directActions.forEach((action) => {
      items.push({ permission: action, depth: 1, section: 'action', moduleId: module.id, parentModuleId: module.id })
    })
  })

  rootActionPermissions.forEach((permission) => {
    items.push({ permission, depth: 0, section: 'action', moduleId: ROOT_ACTIONS_VALUE })
  })

  return items
}

function permissionMatchesSearch(item: FlatPermissionItem, query: string) {
  if (!query) return true
  const permission = item.permission
  const haystack = [
    permission.id,
    permission.label,
    permission.desc,
    permission.path,
    permission.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

export function UserRightsPermissionPanel({
  currentRole,
  permissionTree,
  rootActionPermissions,
  expandedModuleIds,
  formatPermissionLabel,
  canDeleteRoles,
  onDeleteRole,
  onSavePermissions,
  onToggleModuleExpanded,
  onExpandAll,
  onCollapseAll,
}: UserRightsPermissionPanelProps) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState<PermissionVisibilityFilter>('all')
  const [selectedModuleId, setSelectedModuleId] = useState(ALL_MODULES_VALUE)
  const [draftPermissionIds, setDraftPermissionIds] = useState<string[]>([])
  const allPermissionItems = useMemo(
    () => flattenPermissions(permissionTree, rootActionPermissions),
    [permissionTree, rootActionPermissions],
  )
  const allPermissionsById = useMemo(
    () => new Map(allPermissionItems.map((item) => [item.permission.id, item.permission])),
    [allPermissionItems],
  )
  const selectedPermissionSet = useMemo(
    () => new Set(currentRole?.permissions || []),
    [currentRole?.permissions],
  )
  const selectedItems = useMemo(
    () => allPermissionItems.filter((item) => selectedPermissionSet.has(item.permission.id)),
    [allPermissionItems, selectedPermissionSet],
  )
  const selectedAccessItems = selectedItems.filter((item) => item.section === 'access')
  const selectedActionItems = selectedItems.filter((item) => item.section === 'action')
  const moduleFilterOptions = useMemo(
    () => [
      { value: ALL_MODULES_VALUE, label: '全部模块' },
      ...permissionTree.map(({ module }) => ({
        value: module.id,
        label: formatPermissionLabel(module.label),
      })),
      ...(rootActionPermissions.length > 0 ? [{ value: ROOT_ACTIONS_VALUE, label: '独立操作权限' }] : []),
    ],
    [formatPermissionLabel, permissionTree, rootActionPermissions.length],
  )
  const draftPermissionSet = new Set(draftPermissionIds)
  const filteredPermissionItems = allPermissionItems.filter((item) => {
    const normalizedQuery = query.trim().toLowerCase()
    const isChecked = draftPermissionSet.has(item.permission.id)
    const moduleMatches = selectedModuleId === ALL_MODULES_VALUE || item.moduleId === selectedModuleId

    if (!moduleMatches) return false
    if (visibilityFilter === 'selected' && !isChecked) return false
    if (visibilityFilter === 'unselected' && isChecked) return false
    if (!permissionMatchesSearch(item, normalizedQuery)) return false
    if (normalizedQuery) return true
    if (selectedModuleId !== ALL_MODULES_VALUE) return true
    return !item.parentModuleId || expandedModuleIds.includes(item.parentModuleId)
  })
  const readOnly = isSystemRole(currentRole)

  const openEditor = () => {
    setQuery('')
    setVisibilityFilter('all')
    setSelectedModuleId(ALL_MODULES_VALUE)
    setDraftPermissionIds(currentRole?.permissions || [])
    setEditorOpen(true)
  }

  if (!currentRole) {
    return (
      <Card className='rounded-[24px] border-dashed bg-muted/5 p-8 text-center'>
        <p className='text-sm font-bold text-muted-foreground'>请选择一个角色查看权限。</p>
      </Card>
    )
  }

  const toggleDraftPermission = (permissionId: string) => {
    setDraftPermissionIds((current) => buildTreeAssistedPermissionIds(current, permissionId))
  }

  const handleSave = () => {
    onSavePermissions(currentRole.id, draftPermissionIds)
    setEditorOpen(false)
  }

  const renderPermissionSummary = (items: FlatPermissionItem[], emptyText: string) => {
    if (items.length === 0) {
      return (
        <div className='rounded-xl border border-dashed border-muted/50 bg-muted/5 px-3 py-3 text-xs font-bold text-muted-foreground'>
          {emptyText}
        </div>
      )
    }

    return (
      <div className='max-h-64 overflow-y-auto rounded-xl border border-dashed border-muted/50 bg-background/70'>
        {items.map(({ permission, depth }) => (
          <div
            key={permission.id}
            className='flex min-w-0 items-center gap-3 border-b border-dashed border-muted/40 px-3 py-2 last:border-b-0'
          >
            <div className='flex shrink-0 items-center gap-1.5'>
              <Badge variant='outline' className='h-5 rounded-full px-2 text-[8px] font-black uppercase'>
                {getPermissionCategoryLabel(permission.category)}
              </Badge>
              {depth > 0 ? (
                <span className='text-[9px] font-black text-muted-foreground/45'>L{depth}</span>
              ) : null}
            </div>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-xs font-black tracking-tight' title={formatPermissionLabel(permission.label)}>
                {formatPermissionLabel(permission.label)}
              </p>
              <p className='truncate text-[9px] font-medium text-muted-foreground/60' title={permission.path || permission.desc || permission.id}>
                {permission.path || permission.desc || permission.id}
              </p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <Card className='rounded-[24px] border-dashed bg-muted/5 p-4 sm:p-6'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='outline' className={cn(currentRole.color, 'h-7 rounded-full px-3 font-black')}>
                {currentRole.label}
              </Badge>
              <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {currentRole.id}
              </span>
            </div>
            <h3 className='mt-3 text-xl font-black italic tracking-tighter'>已选权限总览</h3>
            <p className='mt-1 text-sm font-medium text-muted-foreground'>
              当前页面只展示所选角色的权限结果，修改权限请进入弹窗多选后一次性保存。
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='rounded-2xl border border-dashed border-muted/50 px-4 py-2'>
              <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/45'>页面权限</p>
              <p className='font-mono text-2xl font-black'>{selectedAccessItems.length}</p>
            </div>
            <div className='rounded-2xl border border-dashed border-muted/50 px-4 py-2'>
              <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/45'>操作权限</p>
              <p className='font-mono text-2xl font-black'>{selectedActionItems.length}</p>
            </div>
            <Button
              type='button'
              onClick={openEditor}
              disabled={readOnly}
              className='h-10 rounded-full px-4 font-black'
            >
              <Pencil className='size-4' />
              编辑权限
            </Button>
            {canDeleteRoles && !readOnly ? (
              <Button
                type='button'
                variant='destructive'
                onClick={() => onDeleteRole(currentRole.id)}
                className='h-10 rounded-full px-4 font-black'
              >
                删除角色
              </Button>
            ) : null}
          </div>
        </div>

        {readOnly ? (
          <div className='mt-4 flex items-start gap-3 rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3'>
            <ShieldCheck className='mt-0.5 size-4 shrink-0 text-primary' />
            <p className='text-xs font-bold leading-5 text-muted-foreground'>
              系统管理员角色拥有全局权限，前端不允许在这里裁剪权限点。
            </p>
          </div>
        ) : null}

        <div className='mt-4 grid gap-4 xl:grid-cols-2'>
          <section className='space-y-2 rounded-2xl border border-dashed border-muted/40 bg-background/40 p-3'>
            <div className='flex items-center justify-between gap-3'>
              <h4 className='text-[11px] font-black uppercase tracking-widest text-muted-foreground/60'>
                页面 / TAB 访问
              </h4>
              <Badge variant='outline' className='rounded-full px-2 text-[9px] font-black'>
                {selectedAccessItems.length}
              </Badge>
            </div>
            {renderPermissionSummary(selectedAccessItems, '当前角色还没有页面访问权限。')}
          </section>

          <section className='space-y-2 rounded-2xl border border-dashed border-muted/40 bg-background/40 p-3'>
            <div className='flex items-center justify-between gap-3'>
              <h4 className='text-[11px] font-black uppercase tracking-widest text-muted-foreground/60'>
                操作 / 数据权限
              </h4>
              <Badge variant='outline' className='rounded-full px-2 text-[9px] font-black'>
                {selectedActionItems.length}
              </Badge>
            </div>
            {renderPermissionSummary(selectedActionItems, '当前角色还没有独立操作权限。')}
          </section>
        </div>
      </Card>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent size='6xl' className='max-h-[calc(100dvh-2rem)] overflow-hidden p-0'>
          <DialogHeader className='border-b border-dashed px-6 py-5'>
            <DialogTitle className='flex items-center gap-2 text-xl font-black italic tracking-tighter'>
              编辑权限
              <Badge variant='outline' className={cn(currentRole.color, 'rounded-full px-3')}>
                {currentRole.label}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              在弹窗内多选权限点，确认后一次性保存。勾选父级会自动带上子级，取消父级会同步移除子级。
            </DialogDescription>
          </DialogHeader>

          <div className='flex flex-col gap-4 overflow-hidden px-6 pb-4'>
            <div className='flex flex-col gap-3 pt-4'>
              <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
                <div className='relative min-w-0 flex-1'>
                  <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50' />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder='搜索权限名称、路径、编号...'
                    className='h-10 rounded-full pl-9'
                  />
                </div>
                <div className='flex shrink-0 flex-wrap items-center gap-2'>
                  <div className='flex rounded-full border border-dashed bg-muted/5 p-1'>
                    {visibilityFilterOptions.map((option) => (
                      <Button
                        key={option.value}
                        type='button'
                        variant={visibilityFilter === option.value ? 'default' : 'ghost'}
                        size='sm'
                        onClick={() => setVisibilityFilter(option.value)}
                        className='h-7 rounded-full px-3 text-[10px] font-black'
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                    <SelectTrigger className='h-9 w-[180px] rounded-full'>
                      <SelectValue placeholder='按模块过滤' />
                    </SelectTrigger>
                    <SelectContent>
                      {moduleFilterOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type='button' variant='outline' size='sm' onClick={onExpandAll} className='rounded-full'>
                    展开全部
                  </Button>
                  <Button type='button' variant='outline' size='sm' onClick={onCollapseAll} className='rounded-full'>
                    收起全部
                  </Button>
                  <Badge variant='outline' className='h-8 rounded-full px-3 font-mono font-black'>
                    {filteredPermissionItems.length} / {allPermissionsById.size}
                  </Badge>
                </div>
              </div>
            </div>

            <ScrollArea className='h-[58vh] rounded-2xl border border-dashed bg-muted/5'>
              <div className='divide-y divide-dashed divide-muted/40'>
                {filteredPermissionItems.map(({ permission, depth }) => {
                  const isModule = permission.category === 'menu'
                  const expanded = expandedModuleIds.includes(permission.id)

                  return (
                    <div
                      key={permission.id}
                      className='flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-primary/5'
                      style={{ paddingLeft: `${16 + depth * 24}px` }}
                    >
                      <div className='flex min-w-0 flex-1 items-start gap-2'>
                        {isModule ? (
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            onClick={() => onToggleModuleExpanded(permission.id)}
                            className='size-7 shrink-0 rounded-full'
                          >
                            <ChevronRight
                              className={cn('size-4 transition-transform', expanded && 'rotate-90')}
                            />
                          </Button>
                        ) : (
                          <div className='size-7 shrink-0' />
                        )}
                        <button
                          type='button'
                          className='min-w-0 flex-1 text-left'
                          onClick={() => toggleDraftPermission(permission.id)}
                        >
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className='truncate text-sm font-black tracking-tight'>
                              {formatPermissionLabel(permission.label)}
                            </span>
                            <Badge variant='outline' className='h-5 rounded-full px-2 text-[8px] font-black uppercase'>
                              {getPermissionCategoryLabel(permission.category)}
                            </Badge>
                          </div>
                          <p className='mt-1 truncate text-[10px] font-medium text-muted-foreground/60'>
                            {permission.path || permission.desc || permission.id}
                          </p>
                        </button>
                      </div>
                      <Checkbox
                        checked={draftPermissionSet.has(permission.id)}
                        onCheckedChange={() => toggleDraftPermission(permission.id)}
                      />
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className='border-t border-dashed px-6 py-4'>
            <Button type='button' variant='outline' onClick={() => setEditorOpen(false)}>
              取消
            </Button>
            <Button type='button' onClick={handleSave} className='font-black'>
              确认保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
