import type { ReactNode } from 'react'
import { MindmapNodeCard } from './mindmap-node-card'
import type { LineMindmapNode, MindmapLevel } from '../data/sample-mindmap'

interface MindmapTreeNodeProps {
  node: LineMindmapNode
  selectedNodeId: string | null
  levelNames: Record<MindmapLevel, string>
  onSelect: (nodeId: string) => void
  depth: number
  children?: ReactNode
}

export function MindmapTreeNode({
  node,
  selectedNodeId,
  levelNames,
  onSelect,
  depth,
  children,
}: MindmapTreeNodeProps) {
  return (
    <div className='relative'>
      {depth > 0 ? <div className='absolute -left-5 top-4.5 h-px w-5 bg-muted-foreground/30' /> : null}

      <MindmapNodeCard
        node={node}
        levelLabel={levelNames[node.level]}
        selected={selectedNodeId === node.id}
        onSelect={onSelect}
      />

      {children}
    </div>
  )
}
