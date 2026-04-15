export const auditEngineQueryKeys = {
  all: ['audit-engine'] as const,
  stats: () => [...auditEngineQueryKeys.all, 'stats'] as const,
}
