import type { LineMindmapNode, MindmapLevel } from '../data/sample-mindmap'
import { MindmapTreeChildren } from './mindmap-tree-children'
import { MindmapTreeNode } from './mindmap-tree-node'

interface MindmapTreeProps {
  node: LineMindmapNode
  selectedNodeId: string | null
  levelNames: Record<MindmapLevel, string>
  onSelect: (nodeId: string) => void
  depth: number
}

export function MindmapTree({
  node,
  selectedNodeId,
  levelNames,
  onSelect,
  depth,
}: MindmapTreeProps) {
  return (
    <MindmapTreeNode
      node={node}
      selectedNodeId={selectedNodeId}
      levelNames={levelNames}
      onSelect={onSelect}
      depth={depth}
    >
      {node.children.length > 0 ? (
        <MindmapTreeChildren>
          {node.children.map((childNode) => (
            <MindmapTree
              key={childNode.id}
              node={childNode}
              selectedNodeId={selectedNodeId}
              levelNames={levelNames}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </MindmapTreeChildren>
      ) : null}
    </MindmapTreeNode>
  )
}
