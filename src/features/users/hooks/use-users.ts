import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type User, type UserListPage, type UserOption } from '../data/schema'
import * as userApi from '../services/user-api'
import { handleServerError } from '@/lib/handle-server-error'
import { buildMutationOptions } from '@/lib/react-query-mutation'
import { type DeltaSet } from '@/lib/delta/types'
import { type CreateUserPayload, type UserReplacePayload } from '../services/user-api'
import { isSuperAdmin } from '../utils/user-utils'

type UsersQueryValue = string | number | boolean | null | undefined | string[]
type UsersQueryParams = Record<string, UsersQueryValue>

const USERS_QUERY_KEY = ['users'] as const

export const useUsersQuery = (params: UsersQueryParams = {}) => {
  return useQuery<UserListPage>({
    queryKey: [...USERS_QUERY_KEY, params],
    queryFn: () => userApi.fetchUsers(params),
  })
}

export const useUserOptionsQuery = (params: UsersQueryParams = {}) => {
  return useQuery<UserOption[]>({
    queryKey: [...USERS_QUERY_KEY, 'options', params],
    queryFn: () => userApi.fetchUserOptions(params),
  })
}

export const useUserMutations = () => {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: userApi.createUser,
    ...buildMutationOptions<User, unknown, CreateUserPayload>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY],
      onError: handleServerError,
    }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, delta, version, user }: { id: string; delta: DeltaSet; version: number; user?: User }) => {
      if (user && isSuperAdmin(user)) {
        throw new Error('[CRITICAL] Cannot modify protected superadmin account')
      }
      return userApi.patchUser(id, delta, version)
    },
    ...buildMutationOptions<User, unknown, { id: string; delta: DeltaSet; version: number; user?: User }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY],
      onError: handleServerError,
    }),
  })

  const replaceMutation = useMutation({
    mutationFn: ({ id, data, user }: { id: string; data: UserReplacePayload; user?: User }) => {
      if (user && isSuperAdmin(user)) {
        throw new Error('[CRITICAL] Cannot replace protected superadmin account')
      }
      return userApi.replaceUser(id, data)
    },
    ...buildMutationOptions<User, unknown, { id: string; data: UserReplacePayload; user?: User }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY],
      onError: handleServerError,
    }),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, user }: { id: string; user: User }) => {
      if (isSuperAdmin(user)) {
        throw new Error('[CRITICAL] Cannot delete protected superadmin account')
      }
      return userApi.deleteUser(id)
    },
    ...buildMutationOptions<unknown, unknown, { id: string; user: User }>({
      queryClient,
      invalidateQueryKeys: [USERS_QUERY_KEY],
      onError: handleServerError,
    }),
  })

  return {
    createMutation,
    updateMutation,
    replaceMutation,
    deleteMutation,
  }
}
