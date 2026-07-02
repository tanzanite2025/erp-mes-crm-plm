import { useMemo } from 'react'
import type { LineMindmapNode } from '../data/line-mindmap-domain'
import type { MindmapParentNodeOption } from '../types'

interface UseLineMindmapParentOptionsOptions {
  nodes: LineMindmapNode[]
  selectedNode: LineMindmapNode | null
}

function collectNodesByPredicate(
  nodes: LineMindmapNode[],
  predicate: (node: LineMindmapNode) => boolean
): LineMindmapNode[] {
  return nodes.flatMap((node) => [
    ...(predicate(node) ? [node] : []),
    ...collectNodesByPredicate(node.children, predicate),
  ])
}

function toParentNodeOption(node: LineMindmapNode): MindmapParentNodeOption {
  return {
    id: node.id,
    label: node.nameSnapshot,
    sourceId: node.sourceId,
  }
}

export function useLineMindmapParentOptions({
  nodes,
  selectedNode,
}: UseLineMindmapParentOptionsOptions) {
  const rootParentNodeOptions = useMemo(
    () =>
      collectNodesByPredicate(nodes, (node) => node.level === 1).map(
        toParentNodeOption
      ),
    [nodes]
  )

  const jobCategoryParentNodeOptions = useMemo(
    () =>
      collectNodesByPredicate(
        nodes,
        (node) => node.level === 2 && node.sourceType === 'jobCategory'
      ).map(toParentNodeOption),
    [nodes]
  )

  const defaultLevel2ParentId =
    selectedNode?.sourceType === 'segment'
      ? selectedNode.id
      : rootParentNodeOptions[0]?.id

  const defaultLevel3ParentId =
    selectedNode?.sourceType === 'jobCategory'
      ? selectedNode.id
      : jobCategoryParentNodeOptions[0]?.id

  return {
    defaultLevel2ParentId,
    defaultLevel3ParentId,
    jobCategoryParentNodeOptions,
    rootParentNodeOptions,
  }
}
