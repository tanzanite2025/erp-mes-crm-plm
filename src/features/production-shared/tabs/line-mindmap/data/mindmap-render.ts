import type { LineMindmapNode } from './line-mindmap-domain'

export interface LineMindmapFlatRow {
  node: LineMindmapNode
  depth: number
  hasNextSibling: boolean
  ancestorHasNextSiblings: boolean[]
}

export function flattenMindmapNodes(
  nodes: LineMindmapNode[]
): LineMindmapFlatRow[] {
  const rows: LineMindmapFlatRow[] = []

  const visit = (
    currentNodes: LineMindmapNode[],
    depth: number,
    ancestorHasNextSiblings: boolean[]
  ) => {
    currentNodes.forEach((node, index) => {
      const hasNextSibling = index < currentNodes.length - 1

      rows.push({
        node,
        depth,
        hasNextSibling,
        ancestorHasNextSiblings: [...ancestorHasNextSiblings],
      })

      if (node.children.length > 0) {
        visit(
          node.children,
          depth + 1,
          depth > 0
            ? [...ancestorHasNextSiblings, hasNextSibling]
            : ancestorHasNextSiblings
        )
      }
    })
  }

  visit(nodes, 0, [])

  return rows
}
