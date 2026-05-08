import { useCallback, useMemo, useState } from 'react'
import type { ProductionLine } from '../../../data/production-line'
import {
  getDefaultSelectedNodeId,
  toLineMindmapLineOptions,
  toLineMindmapNodes,
} from '../adapters/line-mindmap-adapter'
import type { LineMindmapNode } from '../data/sample-mindmap'
import type { LineMindmapNodeDraftMap } from './use-line-mindmap-node-drafts'

function applyNodeDraftMap(
  nodes: LineMindmapNode[],
  nodeDraftMap: LineMindmapNodeDraftMap,
): LineMindmapNode[] {
  let hasChanges = false

  const nextNodes = nodes.map((node) => {
    const nextChildren = node.children.length > 0
      ? applyNodeDraftMap(node.children, nodeDraftMap)
      : node.children
    const draft = nodeDraftMap[node.id]
    const childrenChanged = nextChildren !== node.children

    if (!draft && !childrenChanged) {
      return node
    }

    hasChanges = true

    return {
      ...node,
      ...draft,
      children: nextChildren,
    }
  })

  return hasChanges ? nextNodes : nodes
}

function createNodeIndex(nodes: LineMindmapNode[]): Map<string, LineMindmapNode> {
  const nodeIndex = new Map<string, LineMindmapNode>()

  const visit = (currentNodes: LineMindmapNode[]) => {
    currentNodes.forEach((node) => {
      nodeIndex.set(node.id, node)

      if (node.children.length > 0) {
        visit(node.children)
      }
    })
  }

  visit(nodes)

  return nodeIndex
}

interface UseLineMindmapViewModelOptions {
  lines: ProductionLine[]
  nodeDraftMap: LineMindmapNodeDraftMap
}

export function useLineMindmapViewModel({
  lines,
  nodeDraftMap,
}: UseLineMindmapViewModelOptions) {
  const [activeLineId, setActiveLineId] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

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

    return applyNodeDraftMap(baseNodes, nodeDraftMap)
  }, [baseNodes, nodeDraftMap])
  const nodeIndex = useMemo(() => createNodeIndex(nodes), [nodes])
  const resolvedSelectedNodeId = useMemo(() => {
    if (selectedNodeId && nodeIndex.has(selectedNodeId)) {
      return selectedNodeId
    }

    return getDefaultSelectedNodeId(nodes)
  }, [nodeIndex, nodes, selectedNodeId])
  const selectedNode = useMemo(
    () => (resolvedSelectedNodeId ? nodeIndex.get(resolvedSelectedNodeId) ?? null : null),
    [nodeIndex, resolvedSelectedNodeId],
  )

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
  }, [])

  const settleSelection = useCallback((nextSelectedNodeId: string | null) => {
    setSelectedNodeId(nextSelectedNodeId)
  }, [])

  return {
    activeLine,
    handleSelectNode,
    lineOptions,
    nodes,
    resolvedLineId,
    resolvedSelectedNodeId,
    selectedNode,
    setActiveLineId,
    settleSelection,
  }
}
