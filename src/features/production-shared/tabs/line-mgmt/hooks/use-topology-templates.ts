import { useState, useEffect, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import { TopologyTemplate } from '../types'
import { StorageService } from '@/features/system-mgmt/services/storage-service'

const TEMPLATE_STORAGE_KEY = 'xdfc_topology_templates_v1'
const UPDATE_EVENT = 'xdfc_topology_templates_updated'

const logger = createLogger('useTopologyTemplates')

export function useTopologyTemplates() {
  const [templates, setTemplates] = useState<TopologyTemplate[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  const loadTemplates = useCallback(async () => {
    if (typeof window === 'undefined') return
    try {
      const stored = await StorageService.getItem<TopologyTemplate[]>(TEMPLATE_STORAGE_KEY)
      setTemplates(stored || [])
    } catch (e) {
      logger.error('Failed to load templates from storage', e)
      setTemplates([])
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadTemplates()

    const handleSync = () => loadTemplates()
    window.addEventListener(UPDATE_EVENT, handleSync)
    window.addEventListener('xdfc_storage_initialized', handleSync)

    return () => {
      window.removeEventListener(UPDATE_EVENT, handleSync)
      window.removeEventListener('xdfc_storage_initialized', handleSync)
    }
  }, [loadTemplates])

  const saveTemplates = async (newTemplates: TopologyTemplate[]) => {
    await StorageService.setItem(TEMPLATE_STORAGE_KEY, newTemplates)
    setTemplates(newTemplates)
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT))
  }

  const addTemplate = async (template: TopologyTemplate) => {
    await saveTemplates([template, ...templates])
  }

  const removeTemplate = async (id: string) => {
    await saveTemplates(templates.filter(t => t.id !== id))
  }

  const updateTemplate = async (template: TopologyTemplate) => {
    await saveTemplates(templates.map(t => t.id === template.id ? template : t))
  }

  return {
    templates,
    isLoaded,
    addTemplate,
    removeTemplate,
    updateTemplate,
    refresh: loadTemplates
  }
}
