import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { handleServerError } from '@/lib/handle-server-error'
import { buildMutationOptions } from '@/lib/react-query-mutation'
import { type Role } from '../data/role-schema'
import * as roleService from '../services/role-service'

export const ROLES_QUERY_KEY = ['roles'] as const

export function useRolesQuery() {
  return useQuery<Role[]>({
    queryKey: ROLES_QUERY_KEY,
    queryFn: roleService.fetchRoles,
  })
}

export function useRoleMutations() {
  const queryClient = useQueryClient()

  const upsertRoleMutation = useMutation({
    mutationFn: roleService.upsertRole,
    ...buildMutationOptions<Role, unknown, roleService.UpsertRolePayload>({
      queryClient,
      invalidateQueryKeys: [ROLES_QUERY_KEY],
      onError: handleServerError,
    }),
  })

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) => roleService.deleteRole(roleId),
    ...buildMutationOptions<unknown, unknown, string>({
      queryClient,
      invalidateQueryKeys: [ROLES_QUERY_KEY, ['users']],
      onError: handleServerError,
    }),
  })

  return {
    upsertRoleMutation,
    deleteRoleMutation,
  }
}
