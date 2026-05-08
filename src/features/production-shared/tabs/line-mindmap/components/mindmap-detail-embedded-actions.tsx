import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { type LineMindmapNode, type MindmapNodeActionType } from '../data/sample-mindmap'

interface MindmapDetailEmbeddedActionsProps {
  selectedNode: LineMindmapNode
  onPatchNode: (
    nodeId: string,
    patch: Partial<Pick<LineMindmapNode, 'actionType' | 'dialogKey' | 'note'>>,
  ) => void
}

export function MindmapDetailEmbeddedActions({
  selectedNode,
  onPatchNode,
}: MindmapDetailEmbeddedActionsProps) {
  return (
    <div className='space-y-3 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
      <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/55'>预埋动作</p>
      <Select
        value={selectedNode.actionType}
        onValueChange={(value) => {
          const nextActionType = value as MindmapNodeActionType
          onPatchNode(selectedNode.id, {
            actionType: nextActionType,
            dialogKey: nextActionType === 'open_dialog' ? selectedNode.dialogKey : '',
          })
        }}
      >
        <SelectTrigger className='h-11 rounded-2xl border-none bg-background/80'>
          <SelectValue placeholder='选择动作类型' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='none'>无</SelectItem>
          <SelectItem value='open_dialog'>打开弹窗</SelectItem>
        </SelectContent>
      </Select>
      <Input
        value={selectedNode.dialogKey}
        onChange={(event) => onPatchNode(selectedNode.id, { dialogKey: event.target.value })}
        placeholder='dialogKey，例如 capability_assign_dialog'
        className='h-11 rounded-2xl border-none bg-background/80'
        disabled={selectedNode.actionType !== 'open_dialog'}
      />
      <Textarea
        value={selectedNode.note}
        onChange={(event) => onPatchNode(selectedNode.id, { note: event.target.value })}
        placeholder='补充这个节点后续要承载的弹窗语义、上下文或备注'
        className='min-h-28 rounded-[24px] border-none bg-background/80'
      />
    </div>
  )
}
