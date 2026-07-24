import { useMemo } from 'react'
import type { LineMindmapNode } from '../data/line-mindmap-domain'
import type { MindmapParentNodeOption } from '../types'

interface UseLineMindmapParentOptionsOptions {
  nodes: LineMindmapNode[]
  selectedNode: LineMindmapNode | null
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
  const segmentParentNodeOptions = useMemo(
    () =>
      nodes
        .filter((node) => node.sourceType === 'segment')
        .map(toParentNodeOption),
    [nodes]
  )

  const defaultProcessParentId =
    selectedNode?.sourceType === 'segment'
      ? selectedNode.id
      : segmentParentNodeOptions[0]?.id

  return {
    defaultProcessParentId,
    segmentParentNodeOptions,
  }
}
