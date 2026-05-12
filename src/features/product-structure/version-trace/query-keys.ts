export const bomVersionTraceQueryKeys = {
  root: () => ['engineering', 'boms', 'version-history'] as const,
  list: (params: { bomId?: string; productId?: string }) => [
    'engineering',
    'boms',
    'version-history',
    params.bomId?.trim() || '',
    params.productId?.trim() || '',
  ] as const,
  detail: (id: string) => ['engineering', 'boms', 'version-history', 'detail', id] as const,
}
