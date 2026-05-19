'use client'

import { useMemo, useState } from 'react'
import { CheckCheck, ShieldPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { getDefaultPermissions } from '@/features/authz/data/default-permission-queries'
import { PERMISSION_VERSION, migratePermissions } from '@/features/authz/data/permission-catalog'
import { buildPermissionTree, formatPermissionLabel } from '@/features/authz/utils/permission-tree-utils'
import type { Permission } from '@/features/authz/data/permission-schema'
import type { PermissionPageNode, PermissionTreeNode } from '@/features/authz/utils/permission-tree-types'
import { type User } from '../data/schema'
import { useUserMutations, useUserPermissionsQuery } from '../hooks/use-users'

type UsersPermissionsDialogProps = {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

function collectPagePermissionIDs(pageNode: PermissionPageNode) {
  return [pageNode.page.id, ...pageNode.tabs.map((tab) => tab.id)]
}

function collectModulePermissionIDs(node: PermissionTreeNode) {
  return [
    node.module.id,
    ...node.pages.flatMap((pageNode) => collectPagePermissionIDs(pageNode)),
    ...node.directTabs.map((tab) => tab.id),
    ...node.directActions.map((action) => action.id),
  ]
}

function permissionMatches(permission: Permission, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) {
    return true
  }

  return [permission.id, permission.label, permission.desc, permission.path || '']
    .join(' ')
    .toLowerCase()
    .includes(normalizedKeyword)
}

function filterPermissionTree(nodes: PermissionTreeNode[], keyword: string): PermissionTreeNode[] {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) {
    return nodes
  }

  return nodes.flatMap((node) => {
    const moduleMatched = permissionMatches(node.module, normalizedKeyword)
    if (moduleMatched) {
      return [node]
    }

    const pages = node.pages.flatMap((pageNode) => {
      const pageMatched = permissionMatches(pageNode.page, normalizedKeyword)
      if (pageMatched) {
        return [pageNode]
      }

      const tabs = pageNode.tabs.filter((tab) => permissionMatches(tab, normalizedKeyword))
      if (tabs.length === 0) {
        return []
      }

      return [{
        page: pageNode.page,
        tabs,
      }]
    })

    const directTabs = node.directTabs.filter((tab) => permissionMatches(tab, normalizedKeyword))
    const directActions = node.directActions.filter((action) => permissionMatches(action, normalizedKeyword))

    if (pages.length === 0 && directTabs.length === 0 && directActions.length === 0) {
      return []
    }

    const childNodeCount =
      pages.reduce((count, pageNode) => count + 1 + pageNode.tabs.length, 0) + directTabs.length + directActions.length

    return [{
      module: node.module,
      pages,
      directTabs,
      directActions,
      childNodeCount,
    }]
  })
}

export function UsersPermissionsDialog({
  currentRow,
  open,
  onOpenChange,
}: UsersPermissionsDialogProps) {
  const { t } = useLanguage()
  const userID = (currentRow?.id || '').trim()
  const defaultPermissions = getDefaultPermissions()
  const permissionTree = useMemo(() => buildPermissionTree(defaultPermissions), [defaultPermissions])
  const allPermissionIDs = useMemo(() => {
    return defaultPermissions.map((permission) => permission.id.trim().toLowerCase()).filter(Boolean)
  }, [defaultPermissions])
  const [localDraftPermissionIDs, setLocalDraftPermissionIDs] = useState<string[] | null>(null)
  const [search, setSearch] = useState('')
  const [expandedModuleIDs, setExpandedModuleIDs] = useState<string[]>([])
  const username = currentRow?.username || '-'

  const {
    data: permissionsData,
    isLoading,
    refetch,
  } = useUserPermissionsQuery(userID, open && userID.length > 0)
  const { replaceUserPermissionsMutation } = useUserMutations()

  const serverPermissionIDs = useMemo(
    () => migratePermissions('', PERMISSION_VERSION, permissionsData?.permissions.map((item) => item.permissionId) || []),
    [permissionsData],
  )

  const draftPermissionIDs = localDraftPermissionIDs ?? serverPermissionIDs

  const selectedPermissionIDSet = useMemo(() => {
    return new Set(draftPermissionIDs.map((item) => item.trim().toLowerCase()))
  }, [draftPermissionIDs])

  const visibleTree = useMemo(() => filterPermissionTree(permissionTree, search), [permissionTree, search])
  const visibleTreeColumns = useMemo(() => {
    return visibleTree.reduce<PermissionTreeNode[][]>(
      (columns, node, index) => {
        columns[index % columns.length].push(node)
        return columns
      },
      [[], [], []],
    )
  }, [visibleTree])

  const allPermissionsSelected = useMemo(() => {
    return allPermissionIDs.length > 0 && allPermissionIDs.every((permissionID) => selectedPermissionIDSet.has(permissionID))
  }, [allPermissionIDs, selectedPermissionIDSet])

  const togglePermissionIDs = (permissionIDs: string[]) => {
    const normalizedIDs = permissionIDs.map((permissionID) => permissionID.trim().toLowerCase()).filter(Boolean)
    if (normalizedIDs.length === 0) {
      return
    }

    setLocalDraftPermissionIDs((current) => {
      const base = current ?? draftPermissionIDs
      const currentSet = new Set(base.map((item) => item.trim().toLowerCase()))
      const shouldSelect = normalizedIDs.some((permissionID) => !currentSet.has(permissionID))

      if (shouldSelect) {
        normalizedIDs.forEach((permissionID) => currentSet.add(permissionID))
      } else {
        normalizedIDs.forEach((permissionID) => currentSet.delete(permissionID))
      }

      return Array.from(currentSet)
    })
  }

  const anyMutationPending = replaceUserPermissionsMutation.isPending
  const hasUnsavedChanges = useMemo(() => {
    const currentIDs = serverPermissionIDs.map((item) => item.trim().toLowerCase())
    if (currentIDs.length !== draftPermissionIDs.length) {
      return true
    }
    const currentSet = new Set(currentIDs)
    return draftPermissionIDs.some((permissionID) => !currentSet.has(permissionID.trim().toLowerCase()))
  }, [draftPermissionIDs, serverPermissionIDs])

  const handleReset = () => {
    setLocalDraftPermissionIDs(null)
  }

  const handleSelectAll = () => {
    setLocalDraftPermissionIDs(allPermissionIDs)
  }

  const handleClearAll = () => {
    setLocalDraftPermissionIDs([])
  }

  const handleSave = () => {
    if (!userID) {
      return
    }

    replaceUserPermissionsMutation.mutate(
      {
        id: userID,
        payload: {
          permissions: draftPermissionIDs,
          source: 'manual',
          reason: 'users_permissions_dialog_save',
        },
      },
      {
        onSuccess: async () => {
          setLocalDraftPermissionIDs(null)
          await refetch()
          toast.success(t('users.toast.permissionAssignmentsSaved'))
        },
      },
    )
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setLocalDraftPermissionIDs(null)
      setSearch('')
      setExpandedModuleIDs([])
    }
    onOpenChange(nextOpen)
  }

  const toggleModuleExpanded = (moduleID: string) => {
    setExpandedModuleIDs((current) =>
      current.includes(moduleID) ? current.filter((item) => item !== moduleID) : [...current, moduleID],
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        closeButtonClassName='end-3 top-3 flex size-9 items-center justify-center rounded-full border border-dashed border-muted/40 bg-background/85 text-muted-foreground/70 opacity-100 shadow-sm backdrop-blur-sm transition-all hover:bg-muted/80 hover:text-foreground active:scale-95 focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 data-[state=open]:bg-background/85 data-[state=open]:text-muted-foreground/70 sm:end-4 sm:top-4 sm:size-10'
        className='left-0 top-0 h-svh max-h-svh w-screen max-w-screen grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-t-[32px] rounded-b-none border-none p-0 translate-x-0 translate-y-0 shadow-2xl sm:left-[50%] sm:top-[50%] sm:h-[calc(100svh-2rem)] sm:max-h-[calc(100svh-2rem)] sm:w-[96vw] sm:max-w-[1500px] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-[32px]'
      >
        <DialogHeader className='border-b border-dashed border-muted/40 bg-muted/5 px-4 py-3 pe-12 text-left sm:px-6 sm:pe-16'>
          <div className='flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div className='min-w-0'>
              <DialogTitle className='flex items-center gap-2 text-base font-black italic tracking-tighter uppercase sm:text-lg'>
                <ShieldPlus className='size-4 text-primary' aria-hidden='true' />
                {t('users.permissionAssignments.title')}
              </DialogTitle>
              <DialogDescription className='mt-1 text-[9px] font-black uppercase tracking-[0.12em] opacity-60 sm:text-[10px] sm:tracking-widest'>
                {t('users.permissionAssignments.subtitle', { username })}
              </DialogDescription>
            </div>
            <div className='grid w-full shrink-0 grid-cols-[1.35fr_1fr] gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end'>
              <Button
                type='button'
                variant='outline'
                className='h-10 min-w-0 rounded-full px-2 text-[9px] font-black tracking-tight whitespace-nowrap shadow-sm transition-all active:scale-95 sm:h-9 sm:px-4 sm:text-[10px] sm:tracking-widest'
                onClick={handleReset}
                disabled={anyMutationPending || !hasUnsavedChanges}
              >
                {t('users.permissionAssignments.actions.reset')}
              </Button>
              <Button
                type='button'
                className='h-10 min-w-0 rounded-full px-2 text-[9px] font-black tracking-tight whitespace-nowrap shadow-sm transition-all active:scale-95 sm:h-9 sm:px-4 sm:text-[10px] sm:tracking-widest'
                onClick={handleSave}
                disabled={anyMutationPending || !hasUnsavedChanges}
              >
                {t('users.permissionAssignments.actions.save')}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className='min-h-0 overflow-y-auto overscroll-contain px-3 pb-3 pt-3 sm:px-5 sm:pb-4 xl:overflow-hidden'>
          <div className='grid h-full grid-cols-1 gap-3'>
            <div className='space-y-3 xl:flex xl:min-h-0 xl:flex-col'>
              <div className='shrink-0 space-y-2 rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-2.5 sm:p-3'>
                <div className='space-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0'>
                  <Input
                    className='h-10 rounded-2xl border-none bg-background/80 px-4 text-[12px] shadow-sm placeholder:text-muted-foreground/35 sm:min-w-[220px] sm:flex-1 md:text-sm'
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('users.permissionAssignments.placeholders.search')}
                  />
                  <div className='grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center'>
                    <Button
                      type='button'
                      variant={allPermissionsSelected ? 'outline' : 'default'}
                      className='h-9 w-full justify-center rounded-full px-2 text-[10px] font-black uppercase tracking-[0.12em] shadow-sm transition-all active:scale-95 sm:h-10 sm:w-auto sm:px-3 sm:tracking-widest'
                      onClick={allPermissionsSelected ? handleClearAll : handleSelectAll}
                      disabled={allPermissionIDs.length === 0}
                    >
                      <CheckCheck className='size-4' />
                      {allPermissionsSelected
                        ? t('users.permissionAssignments.actions.deselectAll')
                        : t('users.permissionAssignments.actions.selectAll')}
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-9 w-full justify-center rounded-full px-2 text-[10px] font-black uppercase tracking-[0.12em] shadow-sm transition-all active:scale-95 sm:h-10 sm:w-auto sm:px-3 sm:tracking-widest'
                      onClick={() => setExpandedModuleIDs(permissionTree.map((node) => node.module.id))}
                    >
                      {t('users.permissionAssignments.actions.expandAll')}
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      className='h-9 w-full justify-center rounded-full px-2 text-[10px] font-black uppercase tracking-[0.12em] shadow-sm transition-all active:scale-95 sm:h-10 sm:w-auto sm:px-3 sm:tracking-widest'
                      onClick={() => setExpandedModuleIDs([])}
                    >
                      {t('users.permissionAssignments.actions.collapseAll')}
                    </Button>
                  </div>
                </div>
              </div>

              <div className='space-y-2 rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-2.5 sm:p-3 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col'>
                <div className='shrink-0 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/60 sm:tracking-widest'>{t('users.permissionAssignments.tree.title')}</div>
                {isLoading ? (
                  <div className='py-6 text-center text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/45'>{t('users.permissionAssignments.loading')}</div>
                ) : visibleTree.length === 0 ? (
                  <div className='py-6 text-center text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/45'>{t('users.permissionAssignments.tree.empty')}</div>
                ) : (
                  <div className='grid gap-2 xl:min-h-0 xl:flex-1 xl:grid-cols-3 xl:items-start xl:overflow-y-auto xl:pr-1'>
                    {visibleTreeColumns.map((columnNodes, columnIndex) => (
                      <div key={columnIndex} className='space-y-2'>
                        {columnNodes.map((node) => {
                          const modulePermissionIDs = collectModulePermissionIDs(node)
                          const moduleChecked = modulePermissionIDs.every((permissionID) => selectedPermissionIDSet.has(permissionID.toLowerCase()))
                          const expanded = expandedModuleIDs.includes(node.module.id)
                          return (
                            <div key={node.module.id} className='rounded-xl border border-dashed border-muted/30 bg-background p-2.5 sm:p-3'>
                              <div className='flex items-start justify-between gap-2'>
                                <div className='min-w-0 space-y-0.5'>
                                  <div className='text-[11px] font-black leading-tight tracking-tight sm:text-sm'>{formatPermissionLabel(node.module.label)}</div>
                                  <div className='text-[9px] leading-snug text-muted-foreground sm:text-xs'>{node.module.desc}</div>
                                </div>
                                <div className='flex shrink-0 items-center gap-2'>
                                  <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    className='h-7 rounded-full px-2 text-[9px] font-black uppercase tracking-[0.12em] sm:text-[10px]'
                                    onClick={() => toggleModuleExpanded(node.module.id)}
                                  >
                                    {expanded ? t('users.permissionAssignments.actions.collapse') : t('users.permissionAssignments.actions.expand')}
                                  </Button>
                                  <Checkbox checked={moduleChecked} onCheckedChange={() => togglePermissionIDs(modulePermissionIDs)} />
                                </div>
                              </div>

                              {expanded ? (
                                <div className='mt-3 space-y-2'>
                                  {node.pages.map((pageNode) => {
                                    const pagePermissionIDs = collectPagePermissionIDs(pageNode)
                                    const pageChecked = pagePermissionIDs.every((permissionID) => selectedPermissionIDSet.has(permissionID.toLowerCase()))
                                    return (
                                      <div key={pageNode.page.id} className='space-y-1.5 rounded-lg border border-dashed border-muted/30 p-2.5'>
                                        <div className='flex items-start justify-between gap-2'>
                                          <div className='min-w-0'>
                                            <div className='text-[10px] font-black leading-tight sm:text-sm'>{t('users.permissionAssignments.tree.page')} / {formatPermissionLabel(pageNode.page.label)}</div>
                                            <div className='text-[9px] leading-snug text-muted-foreground sm:text-xs'>{pageNode.page.path || pageNode.page.desc}</div>
                                          </div>
                                          <Checkbox checked={pageChecked} onCheckedChange={() => togglePermissionIDs(pagePermissionIDs)} />
                                        </div>
                                        {pageNode.tabs.map((tab) => (
                                          <div key={tab.id} className='flex items-start justify-between gap-2 py-1 pl-3'>
                                            <div className='min-w-0'>
                                              <div className='text-[10px] leading-tight sm:text-sm'>{t('users.permissionAssignments.tree.tab')} / {formatPermissionLabel(tab.label)}</div>
                                              <div className='text-[9px] leading-snug text-muted-foreground sm:text-xs'>{tab.path || tab.desc}</div>
                                            </div>
                                            <Checkbox
                                              checked={selectedPermissionIDSet.has(tab.id.toLowerCase())}
                                              onCheckedChange={() => togglePermissionIDs([tab.id])}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )
                                  })}

                                  {node.directTabs.map((tab) => (
                                    <div key={tab.id} className='flex items-start justify-between gap-2 rounded-lg border border-dashed border-muted/30 p-2.5'>
                                      <div className='min-w-0'>
                                        <div className='text-[10px] font-black leading-tight sm:text-sm'>{t('users.permissionAssignments.tree.tab')} / {formatPermissionLabel(tab.label)}</div>
                                        <div className='text-[9px] leading-snug text-muted-foreground sm:text-xs'>{tab.path || tab.desc}</div>
                                      </div>
                                      <Checkbox
                                        checked={selectedPermissionIDSet.has(tab.id.toLowerCase())}
                                        onCheckedChange={() => togglePermissionIDs([tab.id])}
                                      />
                                    </div>
                                  ))}

                                  {node.directActions.map((action) => (
                                    <div key={action.id} className='flex items-start justify-between gap-2 rounded-lg border border-dashed border-muted/30 p-2.5'>
                                      <div className='min-w-0'>
                                        <div className='text-[10px] font-black leading-tight sm:text-sm'>{t('users.permissionAssignments.tree.action')} / {formatPermissionLabel(action.label)}</div>
                                        <div className='text-[9px] leading-snug text-muted-foreground sm:text-xs'>{action.desc}</div>
                                      </div>
                                      <Checkbox
                                        checked={selectedPermissionIDSet.has(action.id.toLowerCase())}
                                        onCheckedChange={() => togglePermissionIDs([action.id])}
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  )
}
