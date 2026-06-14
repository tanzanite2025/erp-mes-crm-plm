import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getCookie } from '@/lib/cookies'
import { handleServerError } from '@/lib/handle-server-error'
import { LANGUAGE_COOKIE_NAME } from '@/lib/locale'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { type AppLocale, DEFAULT_LOCALE, translate } from '@/locales'
import { buildFlattenDelta } from '@/lib/delta/flatten-delta'
import { type DeltaSet } from '@/lib/delta/types'
import { type OrgNode } from '../data/org-schema'
import { personnelQueryKeys } from '../query-keys'
import { OrgService } from '../services/org-service'

const logger = createLogger('useOrgMgmt')

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
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const orgTreeQuery = useQuery({
    queryKey: personnelQueryKeys.orgTree(),
    queryFn: () => OrgService.getOrgTree(),
  })

  const orgData = useMemo(() => orgTreeQuery.data ?? [], [orgTreeQuery.data])
  const selectedNode = useMemo(() => {
    if (orgData.length === 0) return null
    if (!selectedNodeId) return orgData[0]
    return findNodeInTree(orgData, selectedNodeId) || orgData[0]
  }, [orgData, selectedNodeId])

  useEffect(() => {
    if (orgData.length === 0) {
      if (selectedNodeId !== null) {
        setSelectedNodeId(null)
      }
      return
    }

    if (!selectedNodeId || !findNodeInTree(orgData, selectedNodeId)) {
      setSelectedNodeId(orgData[0]?.id ?? null)
    }
  }, [orgData, selectedNodeId])

  const loadData = async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: personnelQueryKeys.orgTree() })
      await orgTreeQuery.refetch()
    } catch (err) {
      logger.error('Failed to reload org tree', err)
    }
  }

  const submitMutation = useMutation({
    mutationFn: async ({
      data,
      isPatch,
      delta,
    }: {
      data: OrgNode
      isPatch?: boolean
      delta?: DeltaSet
    }) => {
      if (isPatch && delta && data.id) {
        const savedNode = await OrgService.patchOrgNode(data.id, delta, data.version || 1)
        return { savedNode, isCreate: false }
      }

      const savedNode = await OrgService.saveOrgNode(data)
      return { savedNode, isCreate: !data.id }
    },
    onSuccess: async ({ savedNode, isCreate }) => {
      setSelectedNodeId(savedNode.id ?? null)
      await queryClient.invalidateQueries({ queryKey: personnelQueryKeys.orgTree() })
      toast.success(isCreate ? t('orgPersonnel.org.createSuccess') : t('orgPersonnel.org.saveSuccess'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await OrgService.deleteOrgNode(id)
      return id
    },
    onSuccess: async (deletedId) => {
      if (selectedNodeId === deletedId) {
        setSelectedNodeId(null)
      }
      await queryClient.invalidateQueries({ queryKey: personnelQueryKeys.orgTree() })
      toast.success(t('orgPersonnel.org.deleteSuccess'))
    },
  })

  const linkMutation = useMutation({
    mutationFn: async (items: { type: 'line' | 'segment'; id: string; name: string }[]) => {
      if (!selectedNode || !selectedNode.id) {
        throw new Error('Missing selected organization node')
      }

      const delta: DeltaSet = buildFlattenDelta(selectedNode.linkedArchitecture || [], items, {
        basePath: 'linkedArchitecture',
      })

      return OrgService.patchOrgNode(selectedNode.id, delta, selectedNode.version || 1)
    },
    onSuccess: async (savedNode) => {
      setSelectedNodeId(savedNode.id ?? null)
      await queryClient.invalidateQueries({ queryKey: personnelQueryKeys.orgTree() })
      toast.success(t('orgPersonnel.org.saveSuccess'))
    },
  })

  const handleOrgSubmit = async (data: OrgNode, isPatch?: boolean, delta?: DeltaSet) => {
    try {
      await submitMutation.mutateAsync({ data, isPatch, delta })
    } catch (err) {
      logger.error('Submit failed', err)
      handleServerError(err)
    }
  }

  const handleDelete = async () => {
    if (!selectedNode || !selectedNode.id) return

    try {
      await deleteMutation.mutateAsync(selectedNode.id)
    } catch (err) {
      logger.error('Delete failed', err)
      handleServerError(err)
    }
  }

  const handleLinkSave = async (
    items: { type: 'line' | 'segment'; id: string; name: string }[],
  ) => {
    if (!selectedNode || !selectedNode.id) return

    try {
      await linkMutation.mutateAsync(items)
    } catch (err) {
      logger.error('Link architecture failed', err)
      toast.error(t('orgPersonnel.org.saveFailed'))
    }
  }

  const loadError = orgTreeQuery.error
    ? translate(
        ((getCookie(LANGUAGE_COOKIE_NAME) as AppLocale) || DEFAULT_LOCALE),
        'orgPersonnel.org.saveFailed'
      )
    : null

  return {
    orgData,
    selectedNode,
    setSelectedNode: (node: OrgNode | null) => setSelectedNodeId(node?.id ?? null),
    error: orgTreeQuery.error,
    isLoading: orgTreeQuery.isLoading || (orgTreeQuery.isFetching && orgData.length === 0),
    loadError,
    loadData,
    handleOrgSubmit,
    handleDelete,
    handleLinkSave,
  }
}
