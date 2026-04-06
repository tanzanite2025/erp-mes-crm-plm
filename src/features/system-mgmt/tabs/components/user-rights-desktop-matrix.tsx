import React from 'react'
import { ChevronRight, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  PermissionLabelFormatter,
  PermissionTreeNode,
  UserRightsPermission,
  UserRightsRole,
} from './user-rights-types'

type UserRightsDesktopMatrixProps = {
  roles: UserRightsRole[]
  permissionTree: PermissionTreeNode[]
  rootActionPermissions: UserRightsPermission[]
  editingRoleId: string | null
  tempLabel: string
  expandedModuleIds: string[]
  formatPermissionLabel: PermissionLabelFormatter
  isRenamable: (roleId: string) => boolean
  canDeleteRoles: boolean
  onTempLabelChange: (value: string) => void
  onStartEditing: (roleId: string, label: string) => void
  onSaveLabel: (roleId: string) => void
  onDeleteRole: (roleId: string) => void
  onApplyPermissionTreeToggle: (roleId: string, permissionId: string) => void
  onToggleModuleExpanded: (moduleId: string) => void
  onExpandAll: () => void
  onCollapseAll: () => void
}

export function UserRightsDesktopMatrix({
  roles,
  permissionTree,
  rootActionPermissions,
  editingRoleId,
  tempLabel,
  expandedModuleIds,
  formatPermissionLabel,
  isRenamable,
  canDeleteRoles,
  onTempLabelChange,
  onStartEditing,
  onSaveLabel,
  onDeleteRole,
  onApplyPermissionTreeToggle,
  onToggleModuleExpanded,
  onExpandAll,
  onCollapseAll,
}: UserRightsDesktopMatrixProps) {
  const { t } = useLanguage()
  const stickyColumnClass =
    'sticky left-0 z-20 bg-background text-nowrap border-r border-dashed'
  const stickyColumnWidthClass = 'w-[280px] min-w-[280px] max-w-[280px]'
  const roleColumnWidthClass = 'w-[104px] min-w-[104px] max-w-[104px]'
  const stickyHeaderClass = 'sticky top-0 z-30 bg-background shadow-[0_1px_0_rgba(0,0,0,0.05)] border-b border-dashed'

  return (
    <Card className='hidden md:block rounded-[24px] border-dashed bg-muted/5 shadow-inner border-muted/50 p-1 overflow-hidden'>
      <div className='bg-background rounded-[20px] max-h-[72vh] overflow-auto scrollbar-thin border border-dashed border-muted/50'>
        <Table className='min-w-[820px] border-collapse' noWrapper>
          <TableHeader className='bg-background'>
            <TableRow className='hover:bg-transparent border-none'>
              <TableHead
                className={`sticky top-0 left-0 z-50 ${stickyColumnWidthClass} h-12 bg-background border-b border-r border-dashed text-[10px] font-black tracking-widest text-muted-foreground/40 py-0 pl-8`}
              >
                {t('systemManagement.userRights.table.accessNodes')}
              </TableHead>
              {roles.map((role) => {
                const canRename = isRenamable(role.id)

                return (
                  <TableHead
                    key={role.id}
                    className={`${stickyHeaderClass} text-center py-3 ${roleColumnWidthClass}`}
                    title={role.id}
                  >
                    <div className='flex flex-col items-center gap-1 group'>
                      {editingRoleId === role.id ? (
                        <Input
                          value={tempLabel}
                          onChange={(event) => onTempLabelChange(event.target.value)}
                          onBlur={() => onSaveLabel(role.id)}
                          onKeyDown={(event) => event.key === 'Enter' && onSaveLabel(role.id)}
                          className='h-7 w-20 text-[10px] text-center px-1'
                          autoFocus
                        />
                      ) : (
                        <div className='relative flex w-full items-center justify-center'>
                          <Badge
                            variant='outline'
                            className={`${role.color} h-6 max-w-[78px] px-2 font-bold transition-all ${!canRename ? 'cursor-default opacity-95' : 'cursor-pointer hover:border-blue-400 active:scale-95'}`}
                            title={role.label}
                            onClick={() => {
                              if (!canRename) return
                              onStartEditing(role.id, role.label)
                            }}
                          >
                            <span className='block max-w-[62px] truncate'>{role.label}</span>
                          </Badge>
                          {canDeleteRoles && (
                            <Button
                              variant='ghost'
                              size='icon'
                              className='absolute right-0 top-1/2 size-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity'
                              onClick={() => onDeleteRole(role.id)}
                            >
                              <Trash2 className='size-3 text-destructive' />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {permissionTree.length > 0 && (
              <>
                <TableRow className='bg-muted/10 hover:bg-transparent border-b select-none'>
                  <TableCell
                    className={`${stickyColumnClass} ${stickyColumnWidthClass} bg-muted/10 py-1.5 pl-8 z-20`}
                  >
                    <span className='text-[10px] font-black tracking-widest text-muted-foreground/40'>
                      {t('systemManagement.userRights.sections.accessTree')}
                    </span>
                  </TableCell>
                  <TableCell colSpan={roles.length} className='bg-muted/10 py-1.5 px-8'>
                    <div className='flex items-center justify-end gap-2'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={onExpandAll}
                        className='h-6 rounded-full px-3 text-[10px] font-black tracking-widest'
                      >
                        {t('systemManagement.userRights.actions.expandAll')}
                      </Button>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={onCollapseAll}
                        className='h-6 rounded-full px-3 text-[10px] font-black tracking-widest'
                      >
                        {t('systemManagement.userRights.actions.collapseAll')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {permissionTree.map(({ module, pages, directTabs, directActions, childNodeCount }) => {
                  const expanded = expandedModuleIds.includes(module.id)

                  return (
                    <React.Fragment key={module.id}>
                      <TableRow className='group hover:bg-primary/5 transition-colors border-b'>
                        <TableCell
                          className={`${stickyColumnClass} ${stickyColumnWidthClass} py-3 pl-8 group-hover:bg-primary/5`}
                        >
                          <div className='flex items-start gap-3'>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => onToggleModuleExpanded(module.id)}
                              className='mt-0.5 size-6 shrink-0 rounded-full'
                              aria-label={`${expanded
                                ? t('systemManagement.userRights.actions.collapse')
                                : t('systemManagement.userRights.actions.expand')}${formatPermissionLabel(module.label)}`}
                            >
                              <ChevronRight
                                className={`size-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                              />
                            </Button>
                            <div>
                              <div className='font-black text-sm italic tracking-tighter'>
                                {formatPermissionLabel(module.label)}
                              </div>
                              <div className='text-[10px] font-medium text-muted-foreground/60 mt-0.5 tracking-wide leading-none'>
                                {module.desc}
                              </div>
                              <div className='text-[9px] font-bold tracking-widest text-muted-foreground/45 mt-1 leading-none'>
                                {expanded
                                  ? t('systemManagement.userRights.status.expanded', {
                                      count: childNodeCount,
                                    })
                                  : t('systemManagement.userRights.status.collapsed', {
                                      count: childNodeCount,
                                    })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        {roles.map((role) => {
                          const normalizedRoleId = role.id.trim().toLowerCase()
                          const isGlobalAdmin = normalizedRoleId === 'admin' || normalizedRoleId === 'superadmin'
                          
                          return (
                            <TableCell key={`${role.id}-${module.id}`} className='text-center'>
                              <Checkbox
                                checked={role.permissions.includes(module.id)}
                                disabled={isGlobalAdmin}
                                onCheckedChange={() => onApplyPermissionTreeToggle(role.id, module.id)}
                              />
                            </TableCell>
                          )
                        })}
                      </TableRow>

                      {expanded &&
                        pages.map(({ page, tabs }) => (
                          <React.Fragment key={page.id}>
                            <TableRow className='group hover:bg-primary/5 transition-colors border-b'>
                              <TableCell
                                className={`${stickyColumnClass} ${stickyColumnWidthClass} py-2.5 pl-12 group-hover:bg-primary/5`}
                              >
                                <div className='font-bold text-sm tracking-tight'>
                                  {t('systemManagement.userRights.kinds.page')} /{' '}
                                  {formatPermissionLabel(page.label)}
                                </div>
                                <div className='text-[10px] font-medium text-muted-foreground/60 mt-0.5 tracking-wide leading-none'>
                                  {page.path || page.desc}
                                </div>
                              </TableCell>
                                {roles.map((role) => {
                                  const normalizedRoleId = role.id.trim().toLowerCase()
                                  const isGlobalAdmin = normalizedRoleId === 'admin' || normalizedRoleId === 'superadmin'

                                  return (
                                    <TableCell key={`${role.id}-${page.id}`} className='text-center'>
                                      <Checkbox
                                        checked={role.permissions.includes(page.id)}
                                        disabled={isGlobalAdmin}
                                        onCheckedChange={() => onApplyPermissionTreeToggle(role.id, page.id)}
                                      />
                                    </TableCell>
                                  )
                                })}
                            </TableRow>

                            {tabs.map((tab) => (
                              <TableRow
                                key={tab.id}
                                className='group hover:bg-primary/5 transition-colors border-b'
                              >
                                <TableCell
                                  className={`${stickyColumnClass} ${stickyColumnWidthClass} py-2.5 pl-16 group-hover:bg-primary/5`}
                                >
                                  <div className='font-semibold text-sm tracking-tight'>
                                    {t('systemManagement.userRights.kinds.tab')} /{' '}
                                    {formatPermissionLabel(tab.label)}
                                  </div>
                                  <div className='text-[10px] font-medium text-muted-foreground/60 mt-0.5 tracking-wide leading-none'>
                                    {tab.path || tab.desc}
                                  </div>
                                </TableCell>
                                  {roles.map((role) => {
                                    const normalizedRoleId = role.id.trim().toLowerCase()
                                    const isGlobalAdmin = normalizedRoleId === 'admin' || normalizedRoleId === 'superadmin'

                                    return (
                                      <TableCell key={`${role.id}-${tab.id}`} className='text-center'>
                                        <Checkbox
                                          checked={role.permissions.includes(tab.id)}
                                          disabled={isGlobalAdmin}
                                          onCheckedChange={() => onApplyPermissionTreeToggle(role.id, tab.id)}
                                        />
                                      </TableCell>
                                    )
                                  })}
                              </TableRow>
                            ))}
                          </React.Fragment>
                        ))}

                      {expanded &&
                        directTabs.map((tab) => (
                          <TableRow
                            key={tab.id}
                            className='group hover:bg-primary/5 transition-colors border-b'
                          >
                            <TableCell
                              className={`${stickyColumnClass} ${stickyColumnWidthClass} py-2.5 pl-12 group-hover:bg-primary/5`}
                            >
                              <div className='font-semibold text-sm tracking-tight'>
                                {t('systemManagement.userRights.kinds.tab')} /{' '}
                                {formatPermissionLabel(tab.label)}
                              </div>
                              <div className='text-[10px] font-medium text-muted-foreground/60 mt-0.5 tracking-wide leading-none'>
                                {tab.path || tab.desc}
                              </div>
                            </TableCell>
                            {roles.map((role) => {
                              const normalizedRoleId = role.id.trim().toLowerCase()
                              const isGlobalAdmin = normalizedRoleId === 'admin' || normalizedRoleId === 'superadmin'

                              return (
                                <TableCell key={`${role.id}-${tab.id}`} className='text-center'>
                                  <Checkbox
                                    checked={role.permissions.includes(tab.id)}
                                    disabled={isGlobalAdmin}
                                    onCheckedChange={() => onApplyPermissionTreeToggle(role.id, tab.id)}
                                  />
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))}

                      {expanded &&
                        directActions.map((action) => (
                          <TableRow
                            key={action.id}
                            className='group hover:bg-primary/5 transition-colors border-b'
                          >
                            <TableCell
                              className={`${stickyColumnClass} ${stickyColumnWidthClass} py-2.5 pl-12 group-hover:bg-primary/5`}
                            >
                              <div className='font-semibold text-sm tracking-tight'>
                                {t('systemManagement.userRights.kinds.action')} /{' '}
                                {formatPermissionLabel(action.label)}
                              </div>
                              <div className='text-[10px] font-medium text-muted-foreground/60 mt-0.5 tracking-wide leading-none'>
                                {action.desc}
                              </div>
                            </TableCell>
                            {roles.map((role) => {
                              const normalizedRoleId = role.id.trim().toLowerCase()
                              const isGlobalAdmin = normalizedRoleId === 'admin' || normalizedRoleId === 'superadmin'

                              return (
                                <TableCell key={`${role.id}-${action.id}`} className='text-center'>
                                  <Checkbox
                                    checked={role.permissions.includes(action.id)}
                                    disabled={isGlobalAdmin}
                                    onCheckedChange={() => onApplyPermissionTreeToggle(role.id, action.id)}
                                  />
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))}
                    </React.Fragment>
                  )
                })}
              </>
            )}

            {rootActionPermissions.length > 0 && (
              <>
                <TableRow className='bg-muted/10 hover:bg-transparent border-b select-none'>
                  <TableCell
                    className={`${stickyColumnClass} ${stickyColumnWidthClass} bg-muted/10 py-1.5 pl-8`}
                  >
                    <span className='text-[10px] font-black tracking-widest text-muted-foreground/40'>
                      {t('systemManagement.userRights.sections.moduleActions')}
                    </span>
                  </TableCell>
                  <TableCell colSpan={roles.length} className='bg-muted/10 py-1.5 px-8' />
                </TableRow>
                {rootActionPermissions.map((perm) => (
                  <TableRow
                    key={perm.id}
                    className='group hover:bg-primary/5 transition-colors border-b last:border-0'
                  >
                    <TableCell
                      className={`${stickyColumnClass} ${stickyColumnWidthClass} py-3 pl-8 group-hover:bg-primary/5`}
                    >
                      <div className='font-black text-sm italic tracking-tighter'>{perm.label}</div>
                      <div className='text-[10px] font-medium text-muted-foreground/60 mt-0.5 tracking-wide leading-none'>
                        {perm.desc}
                      </div>
                    </TableCell>
                    {roles.map((role) => {
                      const normalizedRoleId = role.id.trim().toLowerCase()
                      const isGlobalAdmin = normalizedRoleId === 'admin' || normalizedRoleId === 'superadmin'

                      return (
                        <TableCell key={`${role.id}-${perm.id}`} className='text-center'>
                          <Checkbox
                            checked={role.permissions.includes(perm.id)}
                            disabled={isGlobalAdmin}
                            onCheckedChange={() => onApplyPermissionTreeToggle(role.id, perm.id)}
                          />
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
