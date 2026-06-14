import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type DeltaSet } from '@/lib/delta/types'
import { createLogger } from '@/lib/logger'
import {
  type CompositeReadResource,
  resolveQueryFailure,
} from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import {
  type BOMSectionConfig,
  type BOMSectionOption,
} from '../data/bom-section-schema'
import { bomSectionQueryKeys } from '../query-keys'
import {
  BOMSectionService,
  type BOMSectionCreatePayload,
} from '../services/bom-section-service'

const logger = createLogger('useBOMSectionConfig')

export type BOMSectionListResource = CompositeReadResource<{
  sections: BOMSectionConfig[]
}>

export function useBOMSectionConfig() {
  const queryClient = useQueryClient()

  const sectionsQuery = useQuery({
    queryKey: bomSectionQueryKeys.list(),
    queryFn: () => BOMSectionService.getSectionList(),
  })

  const createMutation = useMutation({
    mutationFn: (payload: BOMSectionCreatePayload) =>
      BOMSectionService.createSection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bomSectionQueryKeys.list() })
      queryClient.invalidateQueries({ queryKey: bomSectionQueryKeys.options() })
    },
  })

  const patchMutation = useMutation({
    mutationFn: (params: { id: string; delta: DeltaSet; version: number }) =>
      BOMSectionService.patchSection(params.id, params.delta, params.version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bomSectionQueryKeys.list() })
      queryClient.invalidateQueries({ queryKey: bomSectionQueryKeys.options() })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => BOMSectionService.deleteSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bomSectionQueryKeys.list() })
      queryClient.invalidateQueries({ queryKey: bomSectionQueryKeys.options() })
    },
  })

  const readResource = useMemo<BOMSectionListResource>(() => {
    const failure = resolveQueryFailure({
      data: sectionsQuery.data,
      error: sectionsQuery.error,
      isPending: sectionsQuery.isPending,
      scope: 'useBOMSectionConfig.sections',
      missingMessage: '[CRITICAL] BOM section list missing after load',
      failureMessage: '[CRITICAL] BOM section list query failed',
    })
    if (failure) {
      return {
        status: 'error',
        error: failure.error,
        scope: failure.scope,
      }
    }

    if (sectionsQuery.isPending) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      sections: sectionsQuery.data as BOMSectionConfig[],
    }
  }, [sectionsQuery.data, sectionsQuery.error, sectionsQuery.isPending])

  useEffect(() => {
    if (readResource.status !== 'error') return
    logger.error(
      `Failed to load BOM section list: ${readResource.scope}`,
      readResource.error
    )
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  return {
    readResource,
    sections: readResource.status === 'ready' ? readResource.sections : [],
    isLoading: readResource.status === 'loading',
    error: readResource.status === 'error' ? readResource.error : null,
    refetch: sectionsQuery.refetch,
    createSection: createMutation.mutateAsync,
    patchSection: patchMutation.mutateAsync,
    deleteSection: deleteMutation.mutateAsync,
    isActionLoading:
      createMutation.isPending ||
      patchMutation.isPending ||
      deleteMutation.isPending,
  }
}

export function useBOMSectionOptions(enabled = true) {
  return useQuery({
    queryKey: bomSectionQueryKeys.options(),
    queryFn: (): Promise<BOMSectionOption[]> =>
      BOMSectionService.getSectionOptions(),
    enabled,
  })
}
