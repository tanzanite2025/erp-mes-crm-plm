'use client'

import { useMemo, useState } from 'react'
import { ShieldPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { useLanguage } from '@/context/language-provider'
import { getDefaultPermissions } from '@/features/authz/data/default-permission-queries'
import { buildPermissionTree, formatPermissionLabel } from '@/features/authz/utils/permission-tree-utils'
import type { Permission } from '@/features/authz/data/permission-schema'
import type { PermissionPageNode, PermissionTreeNode } from '@/features/authz/utils/permission-tree-types'
import { type User } from '../data/schema'
import { useUserAccessSnapshotQuery, useUserMutations, useUserPermissionsQuery } from '../hooks/use-users'

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
  const permissionByID = useMemo(() => {
    return new Map(defaultPermissions.map((permission) => [permission.id, permission]))
  }, [defaultPermissions])
  const [localDraftPermissionIDs, setLocalDraftPermissionIDs] = useState<string[] | null>(null)
  const [search, setSearch] = useState('')
  const [showSelectedOnly, setShowSelectedOnly] = useState(false)
  const [expandedModuleIDs, setExpandedModuleIDs] = useState<string[]>(() => permissionTree.map((node) => node.module.id))
  const username = currentRow?.username || '-'

  const {
    data: permissionsData,
    isLoading,
    refetch,
  } = useUserPermissionsQuery(userID, open && userID.length > 0)
  const {
    data: accessSnapshot,
    isLoading: isAccessLoading,
  } = useUserAccessSnapshotQuery(userID, open && userID.length > 0)
  const { replaceUserPermissionsMutation } = useUserMutations()

  const serverPermissionIDs = useMemo(
    () => permissionsData?.permissions.map((item) => item.permissionId) || [],
    [permissionsData],
  )

  const draftPermissionIDs = localDraftPermissionIDs ?? serverPermissionIDs

  const selectedPermissionIDSet = useMemo(() => {
    return new Set(draftPermissionIDs.map((item) => item.trim().toLowerCase()))
  }, [draftPermissionIDs])

  const visibleTree = useMemo(() => {
    const nextTree = filterPermissionTree(permissionTree, search)
    if (!showSelectedOnly) {
      return nextTree
    }

    return nextTree.flatMap((node) => {
      const moduleSelected = selectedPermissionIDSet.has(node.module.id.toLowerCase())
      const pages = node.pages.flatMap((pageNode) => {
        const selectedTabs = pageNode.tabs.filter((tab) => selectedPermissionIDSet.has(tab.id.toLowerCase()))
        if (selectedPermissionIDSet.has(pageNode.page.id.toLowerCase()) || selectedTabs.length > 0) {
          return [{
            page: pageNode.page,
            tabs: selectedTabs,
          }]
        }
        return []
      })
      const directTabs = node.directTabs.filter((tab) => selectedPermissionIDSet.has(tab.id.toLowerCase()))
      const directActions = node.directActions.filter((action) => selectedPermissionIDSet.has(action.id.toLowerCase()))

      if (!moduleSelected && pages.length === 0 && directTabs.length === 0 && directActions.length === 0) {
        return []
      }

      return [{
        module: node.module,
        pages,
        directTabs,
        directActions,
        childNodeCount:
          pages.reduce((count, pageNode) => count + 1 + pageNode.tabs.length, 0) + directTabs.length + directActions.length,
      }]
    })
  }, [permissionTree, search, selectedPermissionIDSet, showSelectedOnly])

  const selectedPermissions = useMemo(() => {
    return draftPermissionIDs
      .map((permissionID) => permissionByID.get(permissionID) || { id: permissionID, label: permissionID, desc: permissionID, category: 'action' as const })
      .sort((a, b) => a.id.localeCompare(b.id))
  }, [draftPermissionIDs, permissionByID])

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
      setShowSelectedOnly(false)
      setExpandedModuleIDs(permissionTree.map((node) => node.module.id))
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
      <DialogContent className='sm:max-w-6xl rounded-[28px] border-none p-0 overflow-hidden'>
        <DialogHeader className='p-6 bg-muted/5 border-b border-dashed border-muted/40 relative text-left'>
          <div className='absolute right-6 top-6 opacity-10 pointer-events-none'>
            <ShieldPlus className='size-10' />
          </div>
          <DialogTitle className='text-lg font-black tracking-tight uppercase'>{t('users.permissionAssignments.title')}</DialogTitle>
          <DialogDescription className='text-xs font-medium opacity-70'>
            {t('users.permissionAssignments.subtitle', { username })}
          </DialogDescription>
        </DialogHeader>

        <div className='px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto'>
          <div className='grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-4'>
            <div className='space-y-4'>
              <div className='rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-4 space-y-3'>
                <div className='grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-center'>
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('users.permissionAssignments.placeholders.search')}
                  />
                  <Button type='button' variant={showSelectedOnly ? 'default' : 'outline'} onClick={() => setShowSelectedOnly((value) => !value)}>
                    {t('users.permissionAssignments.actions.filterSelected')}
                  </Button>
                  <Button type='button' variant='outline' onClick={() => setExpandedModuleIDs(permissionTree.map((node) => node.module.id))}>
                    {t('users.permissionAssignments.actions.expandAll')}
                  </Button>
                  <Button type='button' variant='outline' onClick={() => setExpandedModuleIDs([])}>
                    {t('users.permissionAssignments.actions.collapseAll')}
                  </Button>
                </div>
              </div>

              <div className='rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-4 space-y-3'>
                <div className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>{t('users.permissionAssignments.tree.title')}</div>
                {isLoading ? (
                  <div className='text-xs text-muted-foreground py-6 text-center'>{t('users.permissionAssignments.loading')}</div>
                ) : visibleTree.length === 0 ? (
                  <div className='text-xs text-muted-foreground py-6 text-center'>{t('users.permissionAssignments.tree.empty')}</div>
                ) : (
                  <div className='space-y-3'>
                    {visibleTree.map((node) => {
                      const modulePermissionIDs = collectModulePermissionIDs(node)
                      const moduleChecked = modulePermissionIDs.every((permissionID) => selectedPermissionIDSet.has(permissionID.toLowerCase()))
                      const expanded = expandedModuleIDs.includes(node.module.id)
                      return (
                        <div key={node.module.id} className='rounded-2xl border border-dashed border-muted/30 bg-background p-4'>
                          <div className='flex items-start justify-between gap-3'>
                            <div className='space-y-1'>
                              <div className='text-sm font-black tracking-tight'>{formatPermissionLabel(node.module.label)}</div>
                              <div className='text-xs text-muted-foreground'>{node.module.desc}</div>
                            </div>
                            <div className='flex items-center gap-3'>
                              <Button type='button' variant='ghost' size='sm' onClick={() => toggleModuleExpanded(node.module.id)}>
                                {expanded ? t('users.permissionAssignments.actions.collapse') : t('users.permissionAssignments.actions.expand')}
                              </Button>
                              <Checkbox checked={moduleChecked} onCheckedChange={() => togglePermissionIDs(modulePermissionIDs)} />
                            </div>
                          </div>

                          {expanded ? (
                            <div className='mt-4 space-y-3'>
                              {node.pages.map((pageNode) => {
                                const pagePermissionIDs = collectPagePermissionIDs(pageNode)
                                const pageChecked = pagePermissionIDs.every((permissionID) => selectedPermissionIDSet.has(permissionID.toLowerCase()))
                                return (
                                  <div key={pageNode.page.id} className='rounded-xl border border-dashed border-muted/30 p-3 space-y-2'>
                                    <div className='flex items-start justify-between gap-3'>
                                      <div>
                                        <div className='text-sm font-semibold'>{t('users.permissionAssignments.tree.page')} / {formatPermissionLabel(pageNode.page.label)}</div>
                                        <div className='text-xs text-muted-foreground'>{pageNode.page.path || pageNode.page.desc}</div>
                                      </div>
                                      <Checkbox checked={pageChecked} onCheckedChange={() => togglePermissionIDs(pagePermissionIDs)} />
                                    </div>
                                    {pageNode.tabs.map((tab) => (
                                      <div key={tab.id} className='flex items-start justify-between gap-3 pl-4'>
                                        <div>
                                          <div className='text-sm'>{t('users.permissionAssignments.tree.tab')} / {formatPermissionLabel(tab.label)}</div>
                                          <div className='text-xs text-muted-foreground'>{tab.path || tab.desc}</div>
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
                                <div key={tab.id} className='flex items-start justify-between gap-3 rounded-xl border border-dashed border-muted/30 p-3'>
                                  <div>
                                    <div className='text-sm font-semibold'>{t('users.permissionAssignments.tree.tab')} / {formatPermissionLabel(tab.label)}</div>
                                    <div className='text-xs text-muted-foreground'>{tab.path || tab.desc}</div>
                                  </div>
                                  <Checkbox
                                    checked={selectedPermissionIDSet.has(tab.id.toLowerCase())}
                                    onCheckedChange={() => togglePermissionIDs([tab.id])}
                                  />
                                </div>
                              ))}

                              {node.directActions.map((action) => (
                                <div key={action.id} className='flex items-start justify-between gap-3 rounded-xl border border-dashed border-muted/30 p-3'>
                                  <div>
                                    <div className='text-sm font-semibold'>{t('users.permissionAssignments.tree.action')} / {formatPermissionLabel(action.label)}</div>
                                    <div className='text-xs text-muted-foreground'>{action.desc}</div>
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
                )}
              </div>
            </div>

            <div className='space-y-4'>
              <div className='rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-4 space-y-3'>
                <div className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>{t('users.permissionAssignments.summary.title')}</div>
                {isAccessLoading ? (
                  <div className='text-xs text-muted-foreground'>{t('users.permissionAssignments.accessLoading')}</div>
                ) : (
                  <div className='grid grid-cols-1 gap-3 text-xs'>
                    <div className='space-y-1'>
                      <div className='font-semibold text-muted-foreground'>{t('users.permissionAssignments.summary.explicitPermissionCount')}</div>
                      <div className='font-mono'>{String(draftPermissionIDs.length)}</div>
                    </div>
                    <div className='space-y-1'>
                      <div className='font-semibold text-muted-foreground'>{t('users.permissionAssignments.summary.status')}</div>
                      <div className='font-mono'>{permissionsData?.status || currentRow?.status || '-'}</div>
                    </div>
                    <div className='space-y-1'>
                      <div className='font-semibold text-muted-foreground'>{t('users.permissionAssignments.summary.diagnostics')}</div>
                      <div className='flex flex-wrap gap-2'>
                        {(accessSnapshot?.diagnostics || []).length > 0 ? (
                          accessSnapshot?.diagnostics?.map((item) => (
                            <Badge key={item} variant='secondary'>
                              {item}
                            </Badge>
                          ))
                        ) : (
                          <span className='font-mono'>{t('users.permissionAssignments.summary.none')}</span>
                        )}
                      </div>
                    </div>
                    <div className='space-y-1'>
                      <div className='font-semibold text-muted-foreground'>{t('users.permissionAssignments.summary.unsavedChanges')}</div>
                      <div className='font-mono'>{hasUnsavedChanges ? t('users.permissionAssignments.summary.changed') : t('users.permissionAssignments.summary.unchanged')}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className='rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-4 space-y-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div className='text-xs font-bold uppercase tracking-wide text-muted-foreground'>{t('users.permissionAssignments.selected.title')}</div>
                  <Button type='button' variant='outline' size='sm' onClick={() => setLocalDraftPermissionIDs([])}>
                    {t('users.permissionAssignments.actions.clear')}
                  </Button>
                </div>
                <div className='max-h-[420px] overflow-y-auto space-y-2'>
                  {selectedPermissions.length === 0 ? (
                    <div className='text-xs text-muted-foreground py-6 text-center'>{t('users.permissionAssignments.selected.empty')}</div>
                  ) : (
                    selectedPermissions.map((permission) => (
                      <div key={permission.id} className='rounded-xl border border-dashed border-muted/30 bg-background p-3'>
                        <div className='text-sm font-semibold'>{permission.label}</div>
                        <div className='text-xs text-muted-foreground mt-1'>{permission.id}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className='p-5 border-t border-dashed border-muted/40 bg-muted/5 gap-2'>
          <Button type='button' variant='outline' onClick={handleReset} disabled={anyMutationPending || !hasUnsavedChanges}>
            {t('users.permissionAssignments.actions.reset')}
          </Button>
          <Button type='button' onClick={handleSave} disabled={anyMutationPending || !hasUnsavedChanges}>
            {t('users.permissionAssignments.actions.save')}
          </Button>
          <Button type='button' variant='outline' onClick={() => handleDialogOpenChange(false)}>
            {t('common.actions.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
