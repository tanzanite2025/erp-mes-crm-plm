import { Button } from '@/components/ui/button'
import type { MindmapLevel } from '../data/line-mindmap-domain'

interface MindmapDetailProcessCapabilityActionsProps {
  levelNames: Record<MindmapLevel, string>
  onRemoveProcess?: () => void | Promise<void>
}

export function MindmapDetailProcessCapabilityActions({
  levelNames,
  onRemoveProcess,
}: MindmapDetailProcessCapabilityActionsProps) {
  return (
    <div className='space-y-3'>
      <div className='text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
        当前第三级节点对应 jobCategory 的已挂接能力。
      </div>
      <Button
        type='button'
        variant='outline'
        className='h-11 rounded-full border-dashed border-rose-300 bg-rose-500/10 px-5 text-[10px] font-black tracking-widest text-rose-700 uppercase hover:bg-rose-500/15 hover:text-rose-800'
        onClick={() => {
          void onRemoveProcess?.()
        }}
        disabled={!onRemoveProcess}
      >
        移除当前{levelNames[3]}
      </Button>
    </div>
  )
}
