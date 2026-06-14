import type { ComponentProps } from 'react'
import { PencilLine } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MindmapDetailPanel } from './mindmap-detail-panel'

type MindmapDetailPanelProps = ComponentProps<typeof MindmapDetailPanel>

interface MindmapNodeEditDialogProps extends MindmapDetailPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MindmapNodeEditDialog({
  open,
  onOpenChange,
  selectedNode,
  levelNames,
  ...detailPanelProps
}: MindmapNodeEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[calc(100vw-24px)] max-w-[1100px] rounded-[32px] border-none bg-background p-0 shadow-2xl'>
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
        <div className='relative flex max-h-[min(92vh,980px)] flex-col overflow-hidden'>
          <DialogHeader className='border-b border-dashed border-muted/40 px-5 py-4 text-left md:px-6'>
            <div className='flex items-start gap-3'>
              <div className='flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/30 bg-primary/10'>
                <PencilLine className='size-4 text-primary' />
              </div>
              <div className='space-y-1 pr-8'>
                <DialogTitle className='text-sm font-black tracking-tighter uppercase italic'>
                  节点编辑
                </DialogTitle>
                <DialogDescription className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {selectedNode
                    ? `编辑 ${levelNames[selectedNode.level]} 节点，保持脑图主视图整宽可扫视。`
                    : '选中一个节点后，可在弹窗中查看详情与执行编辑。'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto p-5 md:p-6'>
            <MindmapDetailPanel
              key={selectedNode?.id ?? 'mindmap-detail-dialog-empty'}
              selectedNode={selectedNode}
              levelNames={levelNames}
              {...detailPanelProps}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
