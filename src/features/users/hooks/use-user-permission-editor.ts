import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { getDefaultPermissions } from '@/features/authz/data/default-permission-queries'
import {
  PERMISSION_VERSION,
  migratePermissions,
} from '@/features/authz/data/permission-catalog'
import { buildPermissionTree } from '@/features/authz/utils/permission-tree-utils'
import { type User } from '../data/schema'
import {
  distributeUserPermissionTree,
  filterUserPermissionTree,
} from '../utils/user-permission-tree'
import { useUserMutations, useUserPermissionsQuery } from './use-users'

type UseUserPermissionEditorParams = {
  currentRow?: User
  open: boolean
}

export function useUserPermissionEditor({
  currentRow,
  open,
}: UseUserPermissionEditorParams) {
  const { t } = useLanguage()
  const userID = (currentRow?.id || '').trim()
  const username = currentRow?.username || '-'
  const defaultPermissions = getDefaultPermissions()
  const permissionTree = useMemo(
    () => buildPermissionTree(defaultPermissions),
    [defaultPermissions]
  )
  const allPermissionIDs = useMemo(
    () =>
      defaultPermissions
        .map((permission) => permission.id.trim().toLowerCase())
        .filter(Boolean),
    [defaultPermissions]
  )
  const supportedPermissionIDSet = useMemo(
    () => new Set(allPermissionIDs),
    [allPermissionIDs]
  )

  const [localDraftPermissionIDs, setLocalDraftPermissionIDs] = useState<
    string[] | null
  >(null)
  const [search, setSearch] = useState('')
  const [expandedModuleIDs, setExpandedModuleIDs] = useState<string[]>([])

  const {
    data: permissionsData,
    isLoading,
  } = useUserPermissionsQuery(userID, open && userID.length > 0)
  const { replaceUserPermissionsMutation } = useUserMutations()

  const migratedServerPermissionIDs = useMemo(
    () =>
      migratePermissions(
        '',
        PERMISSION_VERSION,
        permissionsData?.permissions.map((item) => item.permissionId) || []
      ),
    [permissionsData]
  )
  const serverPermissionIDs = useMemo(
    () =>
      migratedServerPermissionIDs.filter((permissionID) =>
        supportedPermissionIDSet.has(permissionID.trim().toLowerCase())
      ),
    [migratedServerPermissionIDs, supportedPermissionIDSet]
  )
  const hasUnsupportedServerPermissions =
    migratedServerPermissionIDs.length !== serverPermissionIDs.length
  const draftPermissionIDs = localDraftPermissionIDs ?? serverPermissionIDs

  const directPermissionIDSet = useMemo(
    () => new Set(draftPermissionIDs.map((item) => item.trim().toLowerCase())),
    [draftPermissionIDs]
  )
  const presetPermissionIDSet = useMemo(
    () =>
      new Set(
        migratePermissions(
          '',
          PERMISSION_VERSION,
          permissionsData?.presetPermissions || []
        )
      ),
    [permissionsData]
  )
  const effectivePermissionIDSet = useMemo(
    () => new Set([...presetPermissionIDSet, ...directPermissionIDSet]),
    [directPermissionIDSet, presetPermissionIDSet]
  )
  const directlyAssignablePermissionIDs = useMemo(
    () =>
      allPermissionIDs.filter(
        (permissionID) => !presetPermissionIDSet.has(permissionID)
      ),
    [allPermissionIDs, presetPermissionIDSet]
  )

  const visibleTree = useMemo(
    () => filterUserPermissionTree(permissionTree, search),
    [permissionTree, search]
  )
  const visibleTreeColumns = useMemo(
    () => distributeUserPermissionTree(visibleTree),
    [visibleTree]
  )
  const allPermissionsSelected = useMemo(
    () =>
      directlyAssignablePermissionIDs.length > 0 &&
      directlyAssignablePermissionIDs.every((permissionID) =>
        directPermissionIDSet.has(permissionID)
      ),
    [directPermissionIDSet, directlyAssignablePermissionIDs]
  )
  const hasUnsavedChanges = useMemo(() => {
    if (hasUnsupportedServerPermissions) return true
    const currentIDs = serverPermissionIDs.map((item) =>
      item.trim().toLowerCase()
    )
    if (currentIDs.length !== draftPermissionIDs.length) return true
    const currentSet = new Set(currentIDs)
    return draftPermissionIDs.some(
      (permissionID) => !currentSet.has(permissionID.trim().toLowerCase())
    )
  }, [draftPermissionIDs, hasUnsupportedServerPermissions, serverPermissionIDs])

  const togglePermissionIDs = (permissionIDs: string[]) => {
    const normalizedIDs = permissionIDs
      .map((permissionID) => permissionID.trim().toLowerCase())
      .filter(
        (permissionID) =>
          Boolean(permissionID) && !presetPermissionIDSet.has(permissionID)
      )
    if (normalizedIDs.length === 0) return

    setLocalDraftPermissionIDs((current) => {
      const base = current ?? draftPermissionIDs
      const currentSet = new Set(base.map((item) => item.trim().toLowerCase()))
      const shouldSelect = normalizedIDs.some(
        (permissionID) => !currentSet.has(permissionID)
      )
      normalizedIDs.forEach((permissionID) => {
        if (shouldSelect) currentSet.add(permissionID)
        else currentSet.delete(permissionID)
      })
      return Array.from(currentSet)
    })
  }

  const save = async () => {
    if (!userID) return
    try {
      await replaceUserPermissionsMutation.mutateAsync({
        id: userID,
        payload: {
          permissions: draftPermissionIDs.filter((permissionID) => {
            const normalized = permissionID.trim().toLowerCase()
            return (
              supportedPermissionIDSet.has(normalized) &&
              !presetPermissionIDSet.has(normalized)
            )
          }),
          reason: 'users_permissions_dialog_save',
        },
      })
      setLocalDraftPermissionIDs(null)
      toast.success(t('users.toast.permissionAssignmentsSaved'))
    } catch {
      return
    }
  }

  const resetEditor = () => {
    setLocalDraftPermissionIDs(null)
    setSearch('')
    setExpandedModuleIDs([])
  }

  return {
    allPermissionIDs,
    allPermissionsSelected,
    anyMutationPending: replaceUserPermissionsMutation.isPending,
    collapseAll: () => setExpandedModuleIDs([]),
    effectivePermissionIDSet,
    expandAll: () =>
      setExpandedModuleIDs(permissionTree.map((node) => node.module.id)),
    expandedModuleIDs,
    hasUnsavedChanges,
    presetPermissionIDSet,
    isLoading,
    permissionsData,
    resetDraft: () => setLocalDraftPermissionIDs(null),
    resetEditor,
    permissionPresetId: permissionsData?.permissionPresetId,
    save,
    search,
    selectAll: () =>
      setLocalDraftPermissionIDs(directlyAssignablePermissionIDs),
    clearAll: () => setLocalDraftPermissionIDs([]),
    setSearch,
    toggleModuleExpanded: (moduleID: string) =>
      setExpandedModuleIDs((current) =>
        current.includes(moduleID)
          ? current.filter((item) => item !== moduleID)
          : [...current, moduleID]
      ),
    togglePermissionIDs,
    username,
    visibleTreeColumns,
    visibleTreeCount: visibleTree.length,
  }
}
