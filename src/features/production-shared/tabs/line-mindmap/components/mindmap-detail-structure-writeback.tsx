import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { HierarchyLevelOptionItem } from '../../hierarchy-config/data/hierarchy-config'
import type { LineMindmapNode, MindmapLevel } from '../data/line-mindmap-domain'

interface MindmapDetailStructureWritebackProps {
  selectedNode: LineMindmapNode
  levelNames: Record<MindmapLevel, string>
  rebindOptions: HierarchyLevelOptionItem[]
  onDeleteSelected?: () => void | Promise<void>
  onRebindSelected?: (option: HierarchyLevelOptionItem) => void | Promise<void>
  onRenameSelected?: (name: string) => void | Promise<void>
}

export function MindmapDetailStructureWriteback({
  selectedNode,
  levelNames,
  rebindOptions,
  onDeleteSelected,
  onRebindSelected,
  onRenameSelected,
}: MindmapDetailStructureWritebackProps) {
  const [rebindOptionId, setRebindOptionId] = useState(
    rebindOptions[0]?.id ?? ''
  )
  const [renameValue, setRenameValue] = useState(selectedNode.nameSnapshot)
  const resolvedRebindOptionId = useMemo(
    () =>
      rebindOptions.some((option) => option.id === rebindOptionId)
        ? rebindOptionId
        : (rebindOptions[0]?.id ?? ''),
    [rebindOptionId, rebindOptions]
  )
  const rebindOption = useMemo(
    () =>
      rebindOptions.find((option) => option.id === resolvedRebindOptionId) ??
      null,
    [rebindOptions, resolvedRebindOptionId]
  )

  const bindingStatusText = selectedNode.hierarchyOptionId
    ? '当前已绑定标准候选项'
    : '当前为脱绑自定义节点'

  return (
    <div className='space-y-2'>
      <p className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
        结构写回
      </p>
      <div className='space-y-4 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
        <div className='space-y-2'>
          <div className='text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {bindingStatusText}
          </div>
          {rebindOptions.length > 0 ? (
            <>
              <Select
                value={resolvedRebindOptionId || undefined}
                onValueChange={setRebindOptionId}
              >
                <SelectTrigger className='h-11 rounded-2xl border-none bg-background/80'>
                  <SelectValue
                    placeholder={`选择要重新绑定的${levelNames[selectedNode.level]}候选项`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {rebindOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type='button'
                variant='outline'
                className='h-11 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest uppercase'
                onClick={() => {
                  if (rebindOption) void onRebindSelected?.(rebindOption)
                }}
                disabled={!rebindOption || !onRebindSelected}
              >
                重新绑定候选项
              </Button>
            </>
          ) : (
            <div className='rounded-[20px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-3 text-[10px] font-black tracking-widest text-amber-700 uppercase'>
              当前没有可用的{levelNames[selectedNode.level]}候选项可供重新绑定。
            </div>
          )}
          <div className='text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            重新绑定后会恢复候选项引用，并将名称更新为候选项当前快照。
          </div>
        </div>

        <div className='space-y-3 border-t border-dashed border-muted/40 pt-4'>
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
          <div className='text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            手工重命名后会清空当前节点的候选项绑定引用。
          </div>
        </div>
      </div>
    </div>
  )
}
