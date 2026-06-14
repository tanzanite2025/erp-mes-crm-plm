import { Layers3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MindmapLevel } from '../data/sample-mindmap'

interface MindmapCanvasEmptyStateProps {
  levelNames: Record<MindmapLevel, string>
  onOpenHierarchyConfig?: () => void
}

export function MindmapCanvasEmptyState({
  levelNames,
  onOpenHierarchyConfig,
}: MindmapCanvasEmptyStateProps) {
  return (
    <div className='flex min-h-full flex-col items-center justify-center rounded-[20px] border border-dashed border-muted/40 bg-muted/5 px-6 py-12 text-center'>
      <p className='text-sm font-black tracking-tighter text-muted-foreground/70 italic'>
        还没有脑图节点
      </p>
      <p className='mt-2 text-[10px] font-black tracking-widest text-muted-foreground/45 uppercase'>
        使用脑图上方工具条快速创建 {levelNames[1]} / {levelNames[2]} /{' '}
        {levelNames[3]} 节点
      </p>
      <div className='mt-6 flex flex-wrap items-center justify-center gap-3'>
        {onOpenHierarchyConfig ? (
          <Button
            type='button'
            variant='outline'
            className='h-11 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest uppercase'
            onClick={onOpenHierarchyConfig}
          >
            <Layers3 className='size-4' /> 维护层级配置
          </Button>
        ) : null}
      </div>
    </div>
  )
}
