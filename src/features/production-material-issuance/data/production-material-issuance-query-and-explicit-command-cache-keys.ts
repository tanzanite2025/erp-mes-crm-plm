export const productionMaterialIssuanceCacheKeys = {
  root: ['production-material-issuance'] as const,
  document: (actorId: string, documentId: string | null) =>
    ['production-material-issuance', 'document', actorId, documentId] as const,
  explicitCommand: (actorId: string, intent: string, scope: string) =>
    [
      'production-material-issuance',
      'explicit-command',
      actorId,
      intent,
      scope,
    ] as const,
}
