import type { QueryClient, QueryKey, UseMutationOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { failLoudly } from './safe-catch'

interface BuildMutationOptionsArgs<TData, TError, TVariables, TContext> {
  invalidateQueryKeys?: QueryKey[]
  onError?: UseMutationOptions<TData, TError, TVariables, TContext>['onError']
  onSuccess?: UseMutationOptions<TData, TError, TVariables, TContext>['onSuccess']
  queryClient: QueryClient
  successMessage?: string
  /** 异常上报的来源标识，用于日志定位。默认 'MutationAction' */
  scope?: string
}

export function buildMutationOptions<TData = unknown, TError = Error, TVariables = void, TContext = unknown>({
  invalidateQueryKeys = [],
  onError,
  onSuccess,
  queryClient,
  successMessage,
  scope = 'MutationAction',
}: BuildMutationOptionsArgs<TData, TError, TVariables, TContext>): Pick<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  'onError' | 'onSuccess'
> {
  return {
    onError: (...args) => {
      // Fail Loudly 契约：先强制上报后台日志
      // 如果业务提供了自定义 onError，则由业务决定 UI 反馈（failLoudly 仅做后台上报）
      // 如果未提供自定义 onError，则 failLoudly 同时负责 UI Toast
      const err = args[0]
      if (onError) {
        failLoudly(err, scope, { silentUI: true })
        onError(...args)
      } else {
        failLoudly(err, scope)
      }
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      await Promise.all(
        invalidateQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      )

      if (successMessage) {
        toast.success(successMessage)
      }

      await onSuccess?.(data, variables, onMutateResult, context)
    },
  }
}
