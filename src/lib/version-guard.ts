export function assertRequiredVersion(
  version: number | null | undefined,
  scope: string,
  entityId?: string
): number {
  if (typeof version !== 'number' || Number.isNaN(version)) {
    const target = entityId ? ` on ${entityId}` : ''
    throw new Error(`[CRITICAL] Missing valid version for ${scope}${target}`)
  }

  return version
}

export function buildVersionedPatchMetadata(
  id: string,
  version: number | null | undefined,
  scope: string,
  extraMetadata: Record<string, unknown> = {}
): { id: string; version: number } & Record<string, unknown> {
  return {
    id,
    version: assertRequiredVersion(version, scope, id),
    ...extraMetadata,
  }
}
