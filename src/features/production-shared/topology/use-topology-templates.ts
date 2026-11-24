import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProductionTopologyTemplate } from '../data/production-line'
import { productionResourceSync } from '../services/production-resource-sync'
import { productionTopologyTemplateSnapshotCopyService } from '../services/production-topology-template-snapshot-copy-service'

const TOPOLOGY_TEMPLATES_QUERY_KEY = [
  'production-shared',
  'topology-template-snapshots',
] as const

export function useTopologyTemplates() {
  const queryClient = useQueryClient()
  const {
    data: templates = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: TOPOLOGY_TEMPLATES_QUERY_KEY,
    queryFn: productionTopologyTemplateSnapshotCopyService.list,
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: TOPOLOGY_TEMPLATES_QUERY_KEY,
    })
  }

  const captureMutation = useMutation({
    mutationFn: productionTopologyTemplateSnapshotCopyService.captureFromLine,
    onSuccess: refresh,
  })
  const updateMutation = useMutation({
    mutationFn: productionTopologyTemplateSnapshotCopyService.update,
    onSuccess: refresh,
  })
  const removeMutation = useMutation({
    mutationFn: productionTopologyTemplateSnapshotCopyService.remove,
    onSuccess: refresh,
  })
  const applyMutation = useMutation({
    mutationFn: ({
      template,
      code,
    }: {
      template: ProductionTopologyTemplate
      code: string
    }) =>
      productionTopologyTemplateSnapshotCopyService.applyToNewLine(
        template,
        code
      ),
    onSuccess: () => productionResourceSync.emitLinesUpdated(),
  })

  return {
    templates,
    isLoaded: !isLoading,
    error,
    isSaving:
      captureMutation.isPending ||
      updateMutation.isPending ||
      removeMutation.isPending ||
      applyMutation.isPending,
    captureFromLine: captureMutation.mutateAsync,
    removeTemplate: removeMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    applyToNewLine: applyMutation.mutateAsync,
    refresh,
  }
}
