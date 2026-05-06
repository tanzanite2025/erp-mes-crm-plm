import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MindmapNodeCard } from './mindmap-node-card'
import type { LineMindmapNode, MindmapLevel } from '../data/sample-mindmap'

interface MindmapCanvasProps {
  nodes: LineMindmapNode[]
  selectedNodeId: string | null
  levelNames: Record<MindmapLevel, string>
  onSelect: (nodeId: string) => void
}

interface MindmapTreeProps {
  node: LineMindmapNode
  selectedNodeId: string | null
  levelNames: Record<MindmapLevel, string>
  onSelect: (nodeId: string) => void
  depth: number
}

function MindmapTree({ node, selectedNodeId, levelNames, onSelect, depth }: MindmapTreeProps) {
  return (
    <div className='relative'>
      {depth > 0 ? <div className='absolute -left-6 top-5 h-px w-6 bg-muted-foreground/25' /> : null}

      <MindmapNodeCard
        node={node}
        levelLabel={levelNames[node.level]}
        selected={selectedNodeId === node.id}
        onSelect={onSelect}
      />

      {node.children.length > 0 ? (
        <div className='relative mt-4 pl-8'>
          <div className='absolute bottom-6 left-2 top-1 w-px bg-muted-foreground/25' />
          <div className='space-y-4'>
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
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function MindmapCanvas({ nodes, selectedNodeId, levelNames, onSelect }: MindmapCanvasProps) {
  return (
    <Card className='rounded-[24px] border border-dashed border-muted/40 bg-background/90 shadow-none'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm font-black italic tracking-tighter text-foreground'>脑图区</CardTitle>
      </CardHeader>
      <CardContent className='overflow-auto p-5'>
        {nodes.length > 0 ? (
          <div className='min-w-[320px] space-y-5'>
            {nodes.map((node) => (
              <MindmapTree
                key={node.id}
                node={node}
                selectedNodeId={selectedNodeId}
                levelNames={levelNames}
                onSelect={onSelect}
                depth={0}
              />
            ))}
          </div>
        ) : (
          <div className='rounded-[20px] border border-dashed border-muted/40 bg-muted/5 px-6 py-12 text-center'>
            <p className='text-sm font-black italic tracking-tighter text-muted-foreground/70'>还没有脑图节点</p>
            <p className='mt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/45'>
              先在右侧新增一级节点，或先去层级配置维护候选项
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
