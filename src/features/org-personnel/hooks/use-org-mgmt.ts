import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { OrgService } from '../services/org-service'
import { type OrgNode } from '../data/org-schema'
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

export function useOrgMgmt() {
  const { locale, t } = useLanguage()
  const [orgData, setOrgData] = useState<OrgNode[]>(initialOrgData)
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

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
      const errorMsg =
        err instanceof Error
          ? err.message
          : locale === 'zh-CN'
            ? '组织架构加载失败，请稍后重试。'
            : 'Failed to load the organization tree. Please try again.'
      setLoadError(errorMsg)
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

  const handleOrgSubmit = async (data: OrgNode) => {
    try {
      const isEdit = !!data.id
      const savedNode = await OrgService.saveOrgNode(data)
      const freshTree = await loadData()
      const updatedNodeInTree = findNodeInTree(freshTree, savedNode.id)
      setSelectedNode(updatedNodeInTree || savedNode)

      toast.success(isEdit ? t('orgPersonnel.org.saveSuccess') : t('orgPersonnel.org.createSuccess'))
    } catch (err) {
      logger.error('Submit failed', err)
      toast.error(t('orgPersonnel.org.saveFailed'))
    }
  }

  const handleDelete = async () => {
    if (!selectedNode) return

    try {
      await OrgService.deleteOrgNode(selectedNode.id)
      await loadData()
      toast.success(t('orgPersonnel.org.saveSuccess'))
    } catch (err) {
      logger.error('Delete failed', err)
      toast.error(t('orgPersonnel.lineMgmt.toasts.deleteFailed'))
    }
  }

  const handleLinkSave = async (
    items: { type: 'line' | 'segment'; id: string; name: string }[],
  ) => {
    if (!selectedNode) return
    try {
      const updated = { ...selectedNode, linkedArchitecture: items }
      await OrgService.saveOrgNode(updated)
      setSelectedNode(updated)
      await loadData()
    } catch (err) {
      logger.error('Link architecture failed', err)
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
