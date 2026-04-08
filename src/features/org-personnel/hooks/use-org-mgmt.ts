import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { OrgService } from '../services/org-service'
import { type OrgNode } from '../data/org-schema'
import { type DeltaSet } from '@/lib/delta/types'
import { initialOrgData } from '../data/org-data'

const logger = createLogger('useOrgMgmt')

/**
 * 助手函数：在树形结构中递归查找节点
 */
function findNodeInTree(nodes: OrgNode[], id: string): OrgNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeInTree(node.children, id)
      if (found) return found
    }
  }
  return null
}

const BACKEND_ERROR_MAP: Record<string, string> = {
  'Organization name already exists under the same parent': 'orgPersonnel.org.backendErrors.nameConflict',
  'Cannot delete organization with child departments': 'orgPersonnel.org.backendErrors.hasChildren',
  'Cannot delete organization with active employees': 'orgPersonnel.org.backendErrors.hasEmployees',
  'Failed to delete organization': 'orgPersonnel.org.backendErrors.deleteFailed',
  'Failed to save organization': 'orgPersonnel.org.backendErrors.saveFailed',
  'Invalid organization payload': 'orgPersonnel.org.backendErrors.invalidPayload',
  'Failed to fetch organization tree': 'orgPersonnel.org.backendErrors.fetchTreeFailed',
}

export function useOrgMgmt() {
  const { locale, t } = useLanguage()
  const [orgData, setOrgData] = useState<OrgNode[]>(initialOrgData)
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const getErrorMessage = (err: unknown) => {
    const rawMsg = err instanceof Error ? err.message : ''
    const mappedKey = BACKEND_ERROR_MAP[rawMsg]
    if (mappedKey) return t(mappedKey as any)
    return rawMsg || t('orgPersonnel.org.saveFailed')
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setLoadError(null)

    try {
      const stored = await OrgService.getOrgTree()
      const nextData = Array.isArray(stored) ? stored : []
      setOrgData(nextData)

      setSelectedNode((current: OrgNode | null) => {
        if (nextData.length === 0) return null
        if (!current) return nextData[0]
        return findNodeInTree(nextData, current.id) || nextData[0]
      })

      return nextData
    } catch (err) {
      setError(err)
      logger.error('Failed to load org tree', err)
      setLoadError(getErrorMessage(err))
      return []
    } finally {
      setIsLoading(false)
    }
  }, [locale])

  useEffect(() => {
    void loadData()

    const handleSync = () => {
      void loadData()
    }
    window.addEventListener('xdfc_org_structure_data_updated', handleSync)

    return () => {
      window.removeEventListener('xdfc_org_structure_data_updated', handleSync)
    }
  }, [loadData])

  const handleOrgSubmit = async (data: OrgNode, isPatch?: boolean, delta?: DeltaSet) => {
    try {
      let savedNode: OrgNode;
      
      if (isPatch && delta && data.id) {
        // SDRTS: 执行增量 Patch
        savedNode = await OrgService.patchOrgNode(data.id, delta, data.version || 1)
        toast.success(t('orgPersonnel.org.saveSuccess'))
      } else {
        // 全量保存 (创建新节点或回退方案)
        savedNode = await OrgService.saveOrgNode(data)
        toast.success(data.id ? t('orgPersonnel.org.saveSuccess') : t('orgPersonnel.org.createSuccess'))
      }

      const freshTree = await loadData()
      const updatedNodeInTree = findNodeInTree(freshTree, savedNode.id!)
      setSelectedNode(updatedNodeInTree || savedNode)
    } catch (err) {
      logger.error('Submit failed', err)
      toast.error(getErrorMessage(err))
    }
  }

  const handleDelete = async () => {
    if (!selectedNode || !selectedNode.id) return

    try {
      await OrgService.deleteOrgNode(selectedNode.id)
      await loadData()
      toast.success(t('orgPersonnel.org.deleteSuccess'))
    } catch (err) {
      logger.error('Delete failed', err)
      toast.error(getErrorMessage(err))
    }
  }

  const handleLinkSave = async (
    items: { type: 'line' | 'segment'; id: string; name: string }[],
  ) => {
    if (!selectedNode || !selectedNode.id) return
    try {
        // SDRTS: 构建针对 linkedArchitecture 的增量
        const delta: DeltaSet = {
            'linkedArchitecture': {
                o: selectedNode.linkedArchitecture || [],
                n: items
            }
        }
        
        const saved = await OrgService.patchOrgNode(selectedNode.id, delta, selectedNode.version || 1)
        setSelectedNode(saved)
        await loadData()
        toast.success(t('orgPersonnel.org.saveSuccess'))
    } catch (err) {
      logger.error('Link architecture failed', err)
      toast.error(t('orgPersonnel.org.saveFailed'))
    }
  }

  return {
    orgData,
    selectedNode,
    setSelectedNode,
    error,
    isLoading,
    loadError,
    loadData,
    handleOrgSubmit,
    handleDelete,
    handleLinkSave,
  }
}
