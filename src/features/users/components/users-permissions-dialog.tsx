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
        showCloseButton={false}
        className='w-[calc(100vw-1rem)] gap-0 overflow-hidden rounded-[28px] border-none p-0 sm:w-[96vw] sm:max-w-[1500px]'
      >
        <DialogHeader className='border-b border-dashed border-muted/40 bg-muted/5 px-5 py-3 text-left sm:px-6'>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
            <div className='min-w-0'>
              <DialogTitle className='flex items-center gap-2 text-lg font-black tracking-tight uppercase'>
                <ShieldPlus className='size-4 text-primary' aria-hidden='true' />
                {t('users.permissionAssignments.title')}
              </DialogTitle>
              <DialogDescription className='mt-1 text-xs font-medium opacity-70'>
                {t('users.permissionAssignments.subtitle', { username })}
              </DialogDescription>
            </div>
            <div className='flex shrink-0 flex-wrap gap-2'>
              <Button type='button' variant='outline' className='rounded-full' onClick={handleReset} disabled={anyMutationPending || !hasUnsavedChanges}>
                {t('users.permissionAssignments.actions.reset')}
              </Button>
              <Button type='button' className='rounded-full' onClick={handleSave} disabled={anyMutationPending || !hasUnsavedChanges}>
                {t('users.permissionAssignments.actions.save')}
              </Button>
              <Button type='button' variant='outline' className='rounded-full' onClick={() => handleDialogOpenChange(false)}>
                {t('common.actions.close')}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className='max-h-[calc(100dvh-6rem)] space-y-3 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 sm:px-5 xl:overflow-hidden'>
          <div className='grid grid-cols-1 gap-3 xl:h-[calc(100dvh-7.75rem)]'>
            <div className='space-y-3 xl:flex xl:min-h-0 xl:flex-col'>
              <div className='shrink-0 space-y-2 rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-3'>
                <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center'>
                  <Input
                    className='sm:min-w-[220px] sm:flex-1'
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('users.permissionAssignments.placeholders.search')}
                  />
                  <Button
                    type='button'
                    variant={allPermissionsSelected ? 'outline' : 'default'}
                    className='rounded-full'
                    onClick={allPermissionsSelected ? handleClearAll : handleSelectAll}
                    disabled={allPermissionIDs.length === 0}
                  >
                    <CheckCheck className='size-4' />
                    {allPermissionsSelected
                      ? t('users.permissionAssignments.actions.deselectAll')
                      : t('users.permissionAssignments.actions.selectAll')}
                  </Button>
                  <Button type='button' variant='outline' className='rounded-full' onClick={() => setExpandedModuleIDs(permissionTree.map((node) => node.module.id))}>
                    {t('users.permissionAssignments.actions.expandAll')}
                  </Button>
                  <Button type='button' variant='outline' className='rounded-full' onClick={() => setExpandedModuleIDs([])}>
                    {t('users.permissionAssignments.actions.collapseAll')}
                  </Button>
                </div>
              </div>

              <div className='space-y-2 rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-3 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col'>
                <div className='shrink-0 text-xs font-bold uppercase tracking-wide text-muted-foreground'>{t('users.permissionAssignments.tree.title')}</div>
                {isLoading ? (
                  <div className='text-xs text-muted-foreground py-6 text-center'>{t('users.permissionAssignments.loading')}</div>
                ) : visibleTree.length === 0 ? (
                  <div className='text-xs text-muted-foreground py-6 text-center'>{t('users.permissionAssignments.tree.empty')}</div>
                ) : (
                  <div className='grid gap-2 xl:min-h-0 xl:flex-1 xl:grid-cols-3 xl:items-start xl:overflow-y-auto xl:pr-1'>
                    {visibleTreeColumns.map((columnNodes, columnIndex) => (
                      <div key={columnIndex} className='space-y-2'>
                        {columnNodes.map((node) => {
                          const modulePermissionIDs = collectModulePermissionIDs(node)
                          const moduleChecked = modulePermissionIDs.every((permissionID) => selectedPermissionIDSet.has(permissionID.toLowerCase()))
                          const expanded = expandedModuleIDs.includes(node.module.id)
                          return (
                            <div key={node.module.id} className='rounded-xl border border-dashed border-muted/30 bg-background p-3'>
                              <div className='flex items-start justify-between gap-2'>
                                <div className='min-w-0 space-y-0.5'>
                                  <div className='text-sm font-black leading-tight tracking-tight'>{formatPermissionLabel(node.module.label)}</div>
                                  <div className='text-xs leading-snug text-muted-foreground'>{node.module.desc}</div>
                                </div>
                                <div className='flex shrink-0 items-center gap-2'>
                                  <Button type='button' variant='ghost' size='sm' className='h-7 rounded-full px-2 text-xs' onClick={() => toggleModuleExpanded(node.module.id)}>
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
                                            <div className='text-sm font-semibold leading-tight'>{t('users.permissionAssignments.tree.page')} / {formatPermissionLabel(pageNode.page.label)}</div>
                                            <div className='text-xs leading-snug text-muted-foreground'>{pageNode.page.path || pageNode.page.desc}</div>
                                          </div>
                                          <Checkbox checked={pageChecked} onCheckedChange={() => togglePermissionIDs(pagePermissionIDs)} />
                                        </div>
                                        {pageNode.tabs.map((tab) => (
                                          <div key={tab.id} className='flex items-start justify-between gap-2 py-1 pl-3'>
                                            <div className='min-w-0'>
                                              <div className='text-sm leading-tight'>{t('users.permissionAssignments.tree.tab')} / {formatPermissionLabel(tab.label)}</div>
                                              <div className='text-xs leading-snug text-muted-foreground'>{tab.path || tab.desc}</div>
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
                                        <div className='text-sm font-semibold leading-tight'>{t('users.permissionAssignments.tree.tab')} / {formatPermissionLabel(tab.label)}</div>
                                        <div className='text-xs leading-snug text-muted-foreground'>{tab.path || tab.desc}</div>
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
                                        <div className='text-sm font-semibold leading-tight'>{t('users.permissionAssignments.tree.action')} / {formatPermissionLabel(action.label)}</div>
                                        <div className='text-xs leading-snug text-muted-foreground'>{action.desc}</div>
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
