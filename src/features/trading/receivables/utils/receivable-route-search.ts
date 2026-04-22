export interface ReceivableRouteSearch {
  sourceType?: string
  sourceRefId?: string
  autoOpen?: boolean
}

export function parseReceivableRouteSearch(search: Record<string, unknown>): ReceivableRouteSearch {
  return {
    sourceType: (search.sourceType as string) || undefined,
    sourceRefId: (search.sourceRefId as string) || undefined,
    autoOpen:
      search.autoOpen === true ||
      search.autoOpen === 'true' ||
      search.autoOpen === 1 ||
      search.autoOpen === '1'
        ? true
        : undefined,
  }
}
