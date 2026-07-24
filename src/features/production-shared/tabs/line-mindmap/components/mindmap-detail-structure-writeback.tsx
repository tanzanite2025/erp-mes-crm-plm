import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { LineMindmapNode, MindmapLevel } from '../data/line-mindmap-domain'

interface MindmapDetailStructureWritebackProps {
  selectedNode: LineMindmapNode
  levelNames: Record<MindmapLevel, string>
  onDeleteSelected?: () => void | Promise<void>
  onRenameSelected?: (name: string) => void | Promise<void>
}

export function MindmapDetailStructureWriteback({
  selectedNode,
  levelNames,
  onDeleteSelected,
  onRenameSelected,
}: MindmapDetailStructureWritebackProps) {
  const [renameValue, setRenameValue] = useState(selectedNode.nameSnapshot)

  return (
    <div className='space-y-2'>
      <p className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
        结构写回
      </p>
      <div className='space-y-3 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
        <div className='rounded-[20px] border border-dashed border-muted/35 bg-background/70 px-4 py-3 text-[10px] leading-relaxed font-bold text-muted-foreground/70'>
          当前节点按 LEVEL {selectedNode.level}{' '}
          识别，名称只作为显示值保存到该产线结构中。
        </div>
        <Input
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          placeholder={`输入新的${levelNames[selectedNode.level]}名称`}
          className='h-11 rounded-2xl border-none bg-background/80'
        />
        <div className='grid gap-3 sm:grid-cols-2'>
          <Button
            type='button'
            className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            onClick={() => {
              void onRenameSelected?.(renameValue)
            }}
            disabled={renameValue.trim() === '' || !onRenameSelected}
          >
            保存重命名
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-11 rounded-full border-dashed border-rose-300 bg-rose-500/10 px-5 text-[10px] font-black tracking-widest text-rose-700 uppercase hover:bg-rose-500/15 hover:text-rose-800'
            onClick={() => {
              void onDeleteSelected?.()
            }}
            disabled={!onDeleteSelected}
          >
            删除当前节点
          </Button>
        </div>
      </div>
    </div>
  )
}
