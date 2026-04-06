import { useState, useEffect, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import type { WorkArchitectureMapping } from '../tabs/work-architecture/types'
import { productionResourceService } from '../services/production-resource-service'
import { toast } from 'sonner'

const logger = createLogger('useWorkArchitecture')

export function useWorkArchitecture() {
  const [capabilityMappings, setCapabilityMappings] = useState<WorkArchitectureMapping>({})
  const [isLoaded, setIsLoaded] = useState(false)

  const loadMappings = useCallback(async () => {
    try {
      await productionResourceService.getLines() // 触发数据预加载或权限检查
      const rawMappings = await productionResourceService.getProcessCapabilityMappings()
      setCapabilityMappings(rawMappings || {})
    } catch (error) {
      logger.error('Failed to load mappings', error)
      toast.error('加载工序映射失败')
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadMappings()
  }, [loadMappings])

  const assignProcessCapability = async (processNodeId: string, processId: string) => {
    try {
      await productionResourceService.assignProcessCapability(processNodeId, processId)
      await loadMappings()
    } catch (error) {
      toast.error('绑定失败')
      throw error
    }
  }

  const removeProcessCapability = async (processNodeId: string, processId: string) => {
    try {
      await productionResourceService.removeProcessCapability(processNodeId, processId)
      await loadMappings()
    } catch (error) {
      toast.error('解绑失败')
      throw error
    }
  }

  const getCapabilitiesForProcess = (processNodeId: string): string[] => {
    return capabilityMappings[processNodeId] || []
  }

  return {
    capabilityMappings,
    isLoaded,
    assignProcessCapability,
    removeProcessCapability,
    getCapabilitiesForProcess,
    refresh: loadMappings
  }
}
