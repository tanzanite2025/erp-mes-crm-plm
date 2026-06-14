export type ReadResource<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error; scope: string }
  | { status: 'ready'; data: T }

export type CompositeReadResource<T extends object> =
  | { status: 'loading' }
  | { status: 'error'; error: Error; scope: string }
  | ({ status: 'ready' } & T)

export interface QueryFailure {
  error: Error
  scope: string
}

export function resolveQueryFailure(params: {
  data: unknown
  error: unknown
  isPending: boolean
  scope: string
  missingMessage: string
  failureMessage: string
}): QueryFailure | null {
  if (params.error) {
    return {
      error:
        params.error instanceof Error
          ? params.error
          : new Error(params.failureMessage),
      scope: params.scope,
    }
  }

  if (params.isPending) {
    return null
  }

  if (!params.data) {
    return {
      error: new Error(params.missingMessage),
      scope: params.scope,
    }
  }

  return null
}
