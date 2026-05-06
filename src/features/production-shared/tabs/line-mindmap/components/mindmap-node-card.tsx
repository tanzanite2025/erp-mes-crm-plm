import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { LineMindmapNode } from '../data/sample-mindmap'

interface MindmapNodeCardProps {
  node: LineMindmapNode
  levelLabel: string
  selected: boolean
  onSelect: (nodeId: string) => void
}

export function MindmapNodeCard({ node, levelLabel, selected, onSelect }: MindmapNodeCardProps) {
  return (
    <button
      type='button'
      onClick={() => onSelect(node.id)}
      className={cn(
        'w-full rounded-[24px] border border-dashed px-4 py-3 text-left transition-all',
        selected
          ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]'
          : 'border-muted/40 bg-background/90 hover:border-primary/30 hover:bg-primary/5',
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='h-5 rounded-full border-dashed px-2 text-[8px] font-mono'>
              L{node.level}
            </Badge>
            <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {levelLabel}
            </span>
          </div>
          <div className='text-sm font-black tracking-tight text-foreground'>
            {node.nameSnapshot}
          </div>
        </div>

        <div className='flex flex-col items-end gap-2'>
          <Badge variant='secondary' className='h-5 rounded-full px-2 text-[8px] font-mono'>
            下级 {node.children.length}
          </Badge>
          {node.actionType === 'open_dialog' ? (
            <Badge className='h-5 rounded-full bg-amber-500/10 px-2 text-[8px] font-mono text-amber-700 hover:bg-amber-500/10'>
              打开弹窗
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  )
}
