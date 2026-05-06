import type { HierarchyLevelOptionItem } from '../../hierarchy-config/data/hierarchy-config'

export type MindmapLevel = 1 | 2 | 3
export type MindmapNodeActionType = 'none' | 'open_dialog'
export type MindmapNodeSourceType = 'segment' | 'jobCategory' | 'process'

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
  hierarchyOptionId?: string
  nameSnapshot: string
  sourceId?: string
  sourceType?: MindmapNodeSourceType
  actionType: MindmapNodeActionType
  dialogKey: string
  note: string
  readonlyMeta?: LineMindmapReadonlyMeta
  children: LineMindmapNode[]
}

function createMindmapNodeId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `line-mindmap-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
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

export function createMindmapNodeFromOption(
  level: MindmapLevel,
  option: Pick<HierarchyLevelOptionItem, 'id' | 'name'>,
  parentId?: string,
): LineMindmapNode {
  return {
    id: createMindmapNodeId(),
    parentId,
    level,
    hierarchyOptionId: option.id,
    nameSnapshot: option.name,
    actionType: 'none',
    dialogKey: '',
    note: '',
    children: [],
  }
}

export function createDemoMindmap(options: {
  level1Options: HierarchyLevelOptionItem[]
  level2Options: HierarchyLevelOptionItem[]
  level3Options: HierarchyLevelOptionItem[]
}): LineMindmapNode[] {
  const { level1Options, level2Options, level3Options } = options
  const firstLevel1 = level1Options[0]

  if (!firstLevel1) {
    return []
  }

  const rootNode = createMindmapNodeFromOption(1, firstLevel1)
  const firstLevel2 = level2Options[0]
  const secondLevel2 = level2Options[1]
  const firstLevel3 = level3Options[0]
  const secondLevel3 = level3Options[1]

  const firstBranch = firstLevel2
    ? {
        ...createMindmapNodeFromOption(2, firstLevel2, rootNode.id),
        children: firstLevel3
          ? [createMindmapNodeFromOption(3, firstLevel3, rootNode.id)]
          : [],
      }
    : null

  const secondBranch = secondLevel2
    ? {
        ...createMindmapNodeFromOption(2, secondLevel2, rootNode.id),
        children: secondLevel3
          ? [createMindmapNodeFromOption(3, secondLevel3, rootNode.id)]
          : [],
      }
    : null

  return [
    {
      ...rootNode,
      children: [firstBranch, secondBranch].filter(Boolean) as LineMindmapNode[],
    },
  ]
}

export function findMindmapNode(nodes: LineMindmapNode[], nodeId: string): LineMindmapNode | null {
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
  updater: (node: LineMindmapNode) => LineMindmapNode,
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
  childNode: LineMindmapNode,
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
