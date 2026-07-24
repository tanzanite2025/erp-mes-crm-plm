export type MindmapLevel = 1 | 2 | 3
export type MindmapNodeActionType = 'none' | 'open_dialog'
export type MindmapNodeSourceType = 'segment' | 'process'

export interface LineMindmapReadonlyMeta {
  code?: string
  description?: string
  isActive?: boolean
  lineId?: string
  lineName?: string
  sortOrder?: number
}

export interface LineMindmapNode {
  id: string
  parentId?: string
  level: MindmapLevel
  nameSnapshot: string
  sourceId?: string
  sourceType?: MindmapNodeSourceType
  actionType: MindmapNodeActionType
  dialogKey: string
  note: string
  readonlyMeta?: LineMindmapReadonlyMeta
  children: LineMindmapNode[]
}

export function getNextMindmapLevel(level: MindmapLevel): MindmapLevel | null {
  if (level === 1) {
    return 2
  }

  if (level === 2) {
    return 3
  }

  return null
}

export function findMindmapNode(
  nodes: LineMindmapNode[],
  nodeId: string
): LineMindmapNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node
    }

    const matchedChild = findMindmapNode(node.children, nodeId)
    if (matchedChild) {
      return matchedChild
    }
  }

  return null
}

export function updateMindmapNode(
  nodes: LineMindmapNode[],
  nodeId: string,
  updater: (node: LineMindmapNode) => LineMindmapNode
): LineMindmapNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return updater(node)
    }

    if (node.children.length === 0) {
      return node
    }

    return {
      ...node,
      children: updateMindmapNode(node.children, nodeId, updater),
    }
  })
}

export function appendMindmapChild(
  nodes: LineMindmapNode[],
  parentId: string,
  childNode: LineMindmapNode
): LineMindmapNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...node.children, childNode],
      }
    }

    if (node.children.length === 0) {
      return node
    }

    return {
      ...node,
      children: appendMindmapChild(node.children, parentId, childNode),
    }
  })
}
