'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { type ReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import { bomQueryKeys } from '../query-keys'
import { bomService, type BOMDetailSource } from '../services/bom-service'
import { resolveBOMWorkspaceAuthoritativeProtocolDraftFromRawDetailSource } from './bom-workspace-authoritative-protocol-resolver'
import { buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource } from './bom-workspace-protocol-source-adapter'
import { type BOMWorkspaceParentChildrenProtocolDraft } from './bom-workspace-source-model'

const logger = createLogger('useBOMEditDetailSource')

export type BOMEditDetailSourceResource = ReadResource<{
  bom: BOM
  rawSource: BOMDetailSource['rawSource']
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}>

interface UseBOMEditDetailSourceParams {
  bomId?: string
  open: boolean
  isEdit: boolean
  activeSections: BOMSectionOption[]
  fields: Array<{ id: string }>
  watchedItems?: BOM['items']
}

export function useBOMEditDetailSource({
  bomId,
  open,
  isEdit,
  activeSections,
  fields,
  watchedItems,
}: UseBOMEditDetailSourceParams): BOMEditDetailSourceResource | undefined {
  const enabled = open && isEdit && typeof bomId === 'string' && bomId.trim().length > 0
  const normalizedBOMId = bomId?.trim() ?? ''

  const bomDetailQuery = useQuery({
    queryKey: bomQueryKeys.detail(normalizedBOMId),
    queryFn: () => bomService.getBOMDetailSource(normalizedBOMId),
    enabled,
  })

  const resource = useMemo<BOMEditDetailSourceResource | undefined>(() => {
    if (!enabled) {
      return undefined
    }

    if (bomDetailQuery.isLoading) {
      return { status: 'loading' }
    }

    const failure = resolveQueryFailure({
      data: bomDetailQuery.data,
      error: bomDetailQuery.error,
      isPending: bomDetailQuery.isLoading,
      scope: 'useBOMEditDetailSource.detail',
      missingMessage: '[CRITICAL] BOM edit detail source is missing after load',
      failureMessage: '[CRITICAL] BOM edit detail query failed',
    })

    if (failure) {
      return {
        status: 'error',
        error: failure.error,
        scope: failure.scope,
      }
    }

    const detailSource = bomDetailQuery.data as BOMDetailSource
    const bom = detailSource.bom
    const authoritativeProtocolDraft = resolveBOMWorkspaceAuthoritativeProtocolDraftFromRawDetailSource(detailSource.rawSource)

    if (!authoritativeProtocolDraft) {
      return {
        status: 'error',
        error: new Error('[CRITICAL] BOM edit detail is missing authoritative relation sidecar'),
        scope: 'useBOMEditDetailSource.authoritativeSidecar',
      }
    }

    return {
      status: 'ready',
      data: {
        bom,
        rawSource: detailSource.rawSource,
        protocolDraft: buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource({
          sourceBOM: bom,
          activeSections,
          fields,
          watchedItems,
          authoritativeProtocolDraft,
        }),
      },
    }
  }, [activeSections, bomDetailQuery.data, bomDetailQuery.error, bomDetailQuery.isLoading, enabled, fields, watchedItems])

  useEffect(() => {
    if (!resource || resource.status !== 'error') {
      return
    }

    logger.error(`BOM edit detail source failed: ${resource.scope}`, resource.error)
    failLoudly(resource.error, resource.scope)
  }, [resource])

  return resource
}
