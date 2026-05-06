import { useCallback, useMemo, useState } from 'react'
import type { ProductionLine } from '../../../data/production-line'
import type { HierarchyLevelOptionItem } from '../../hierarchy-config/data/hierarchy-config'
import {
  getDefaultSelectedNodeId,
  toLineMindmapLineOptions,
  toLineMindmapNodes,
} from '../adapters/line-mindmap-adapter'
import {
  findMindmapNode,
  updateMindmapNode,
} from '../data/sample-mindmap'
import type { LineMindmapNodeDraftMap } from './use-line-mindmap-node-drafts'

interface UseLineMindmapViewModelOptions {
  level2Options: HierarchyLevelOptionItem[]
  lines: ProductionLine[]
  nodeDraftMap: LineMindmapNodeDraftMap
}

export function useLineMindmapViewModel({
  level2Options,
  lines,
  nodeDraftMap,
}: UseLineMindmapViewModelOptions) {
  const [activeLineId, setActiveLineId] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isRootInsertMode, setIsRootInsertMode] = useState(false)

  const lineOptions = useMemo(() => toLineMindmapLineOptions(lines), [lines])
  const resolvedLineId = useMemo(() => {
    if (lineOptions.some((line) => line.id === activeLineId)) {
      return activeLineId
    }

    return lineOptions[0]?.id ?? ''
  }, [activeLineId, lineOptions])
  const activeLine = useMemo(
    () => lines.find((line) => line.id === resolvedLineId) ?? null,
    [lines, resolvedLineId],
  )
  const baseNodes = useMemo(() => toLineMindmapNodes(activeLine), [activeLine])
  const nodes = useMemo(() => {
    if (Object.keys(nodeDraftMap).length === 0) {
      return baseNodes
    }

    return Object.entries(nodeDraftMap).reduce(
      (currentNodes, [nodeId, draft]) =>
        updateMindmapNode(currentNodes, nodeId, (node) => ({
          ...node,
          ...draft,
        })),
      baseNodes,
    )
  }, [baseNodes, nodeDraftMap])
  const resolvedSelectedNodeId = useMemo(() => {
    if (isRootInsertMode) {
      return null
    }

    if (selectedNodeId && findMindmapNode(nodes, selectedNodeId)) {
      return selectedNodeId
    }

    return getDefaultSelectedNodeId(nodes)
  }, [isRootInsertMode, nodes, selectedNodeId])
  const selectedNode = useMemo(
    () => (resolvedSelectedNodeId ? findMindmapNode(nodes, resolvedSelectedNodeId) : null),
    [nodes, resolvedSelectedNodeId],
  )
  const childOptions = useMemo(() => {
    if (selectedNode?.sourceType === 'segment') {
      return level2Options
    }

    return []
  }, [level2Options, selectedNode])

  const enterRootInsertMode = useCallback(() => {
    setIsRootInsertMode(true)
    setSelectedNodeId(null)
  }, [])

  const handleSelectNode = useCallback((nodeId: string) => {
    setIsRootInsertMode(false)
    setSelectedNodeId(nodeId)
  }, [])

  const settleSelection = useCallback((nextSelectedNodeId: string | null) => {
    setIsRootInsertMode(false)
    setSelectedNodeId(nextSelectedNodeId)
  }, [])

  return {
    activeLine,
    childOptions,
    enterRootInsertMode,
    handleSelectNode,
    isRootInsertMode,
    lineOptions,
    nodes,
    resolvedLineId,
    resolvedSelectedNodeId,
    selectedNode,
    setActiveLineId,
    settleSelection,
  }
}
