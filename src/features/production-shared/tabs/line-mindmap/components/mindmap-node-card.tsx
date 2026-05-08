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
        'w-full rounded-[20px] border border-dashed px-3.5 py-2.5 text-left transition-all',
        selected
          ? 'border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]'
          : 'border-muted/40 bg-background/90 hover:border-primary/30 hover:bg-primary/5',
      )}
    >
      <div className='flex items-start justify-between gap-2.5'>
        <div className='min-w-0 space-y-1.5'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <Badge variant='outline' className='h-4 rounded-full border-dashed px-1.5 text-[8px] font-mono'>
              L{node.level}
            </Badge>
            <span className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {levelLabel}
            </span>
          </div>
          <div className='truncate text-[13px] font-black tracking-tight text-foreground'>
            {node.nameSnapshot}
          </div>
        </div>

        <div className='flex shrink-0 flex-col items-end gap-1.5'>
          <Badge variant='secondary' className='h-4 rounded-full px-1.5 text-[8px] font-mono'>
            下级 {node.children.length}
          </Badge>
          {node.actionType === 'open_dialog' ? (
            <Badge className='h-4 rounded-full bg-amber-500/10 px-1.5 text-[8px] font-mono text-amber-700 hover:bg-amber-500/10'>
              打开弹窗
            </Badge>
          ) : null}
        </div>
      </div>
    </button>
  )
}
