import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { handleServerError } from '@/lib/handle-server-error'
import { buildMutationOptions } from '@/lib/react-query-mutation'
import { refreshCurrentAccountAccessSnapshotAfterPermissionPresetMutation } from '@/features/authz/services/account-access-refresh-service'
import { type PermissionPreset } from '../data/permission-preset-schema'
import * as permissionPresetService from '../services/permission-preset-service'

export const PERMISSION_PRESETS_QUERY_KEY = ['permission-presets'] as const

export function usePermissionPresetsQuery(enabled = true) {
  return useQuery<PermissionPreset[]>({
    queryKey: PERMISSION_PRESETS_QUERY_KEY,
    queryFn: permissionPresetService.fetchPermissionPresets,
    enabled,
  })
}

export function usePermissionPresetMutations() {
  const queryClient = useQueryClient()

  const upsertPermissionPresetMutation = useMutation({
    mutationFn: permissionPresetService.upsertPermissionPreset,
    ...buildMutationOptions<
      PermissionPreset,
      unknown,
      permissionPresetService.UpsertPermissionPresetPayload
    >({
      queryClient,
      invalidateQueryKeys: [PERMISSION_PRESETS_QUERY_KEY],
      onError: handleServerError,
      onSuccess: () =>
        refreshCurrentAccountAccessSnapshotAfterPermissionPresetMutation(),
    }),
  })

  const deletePermissionPresetMutation = useMutation({
    mutationFn: (permissionPresetId: string) =>
      permissionPresetService.deletePermissionPreset(permissionPresetId),
    ...buildMutationOptions<unknown, unknown, string>({
      queryClient,
      invalidateQueryKeys: [PERMISSION_PRESETS_QUERY_KEY, ['users']],
      onError: handleServerError,
      onSuccess: () =>
        refreshCurrentAccountAccessSnapshotAfterPermissionPresetMutation(),
    }),
  })

  return {
    upsertPermissionPresetMutation,
    deletePermissionPresetMutation,
  }
}
