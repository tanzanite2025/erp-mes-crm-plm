import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { type TopologyTemplate } from '../types'

const TEMPLATE_STORAGE_KEY = 'xdfc_topology_templates_v1'
const TOPOLOGY_TEMPLATES_QUERY_KEY = [
  'production-shared',
  'topology-templates',
] as const

const logger = createLogger('useTopologyTemplates')

async function loadTopologyTemplates() {
  try {
    const stored =
      await StorageService.getItem<TopologyTemplate[]>(TEMPLATE_STORAGE_KEY)
    return stored || []
  } catch (error) {
    logger.error('Failed to load templates from storage', error)
    return []
  }
}

export function useTopologyTemplates() {
  const queryClient = useQueryClient()
  const { data: templates = [], isLoading } = useQuery<TopologyTemplate[]>({
    queryKey: TOPOLOGY_TEMPLATES_QUERY_KEY,
    queryFn: loadTopologyTemplates,
    initialData: [],
  })

  const saveTemplatesMutation = useMutation({
    mutationFn: async (nextTemplates: TopologyTemplate[]) => {
      await StorageService.setItem(TEMPLATE_STORAGE_KEY, nextTemplates)
      return nextTemplates
    },
    onSuccess: (nextTemplates) => {
      queryClient.setQueryData(TOPOLOGY_TEMPLATES_QUERY_KEY, nextTemplates)
    },
  })

  const addTemplate = async (template: TopologyTemplate) => {
    await saveTemplatesMutation.mutateAsync([template, ...templates])
  }

  const removeTemplate = async (id: string) => {
    await saveTemplatesMutation.mutateAsync(
      templates.filter((template) => template.id !== id)
    )
  }

  const updateTemplate = async (template: TopologyTemplate) => {
    await saveTemplatesMutation.mutateAsync(
      templates.map((item) => (item.id === template.id ? template : item))
    )
  }

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: TOPOLOGY_TEMPLATES_QUERY_KEY,
    })
  }

  return {
    templates,
    isLoaded: !isLoading,
    addTemplate,
    removeTemplate,
    updateTemplate,
    refresh,
  }
}
