import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getNextMindmapLevel,
  type LineMindmapNode,
  type MindmapLevel,
} from '../data/line-mindmap-domain'
import type { LineMindmapProcessOption } from '../types'

interface MindmapDetailAddChildActionsProps {
  selectedNode: LineMindmapNode
  levelNames: Record<MindmapLevel, string>
  processOptions: LineMindmapProcessOption[]
  onAssignProcess?: (processId: string) => void | Promise<void>
}

export function MindmapDetailAddChildActions({
  selectedNode,
  levelNames,
  processOptions,
  onAssignProcess,
}: MindmapDetailAddChildActionsProps) {
  const [processOptionId, setProcessOptionId] = useState(
    processOptions[0]?.id ?? ''
  )
  const resolvedProcessOptionId = useMemo(
    () =>
      processOptions.some((option) => option.id === processOptionId)
        ? processOptionId
        : (processOptions[0]?.id ?? ''),
    [processOptionId, processOptions]
  )
  const processOption = useMemo(
    () =>
      processOptions.find((option) => option.id === resolvedProcessOptionId) ??
      null,
    [processOptions, resolvedProcessOptionId]
  )

  const nextLevel = getNextMindmapLevel(selectedNode.level)
  const canAssignProcess = selectedNode.sourceType === 'jobCategory'

  return (
    <div className='space-y-2'>
      <p className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
        添加下级
      </p>
      {nextLevel ? (
        nextLevel === 3 ? (
          processOptions.length > 0 ? (
            <div className='space-y-3 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
              <Select
                value={resolvedProcessOptionId || undefined}
                onValueChange={setProcessOptionId}
              >
                <SelectTrigger className='h-11 rounded-2xl border-none bg-background/80'>
                  <SelectValue
                    placeholder={`选择要挂接的${levelNames[nextLevel]}`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {processOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                      {option.code ? ` · ${option.code}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type='button'
                className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
                onClick={() => {
                  if (processOption) void onAssignProcess?.(processOption.id)
                }}
                disabled={
                  !canAssignProcess || !processOption || !onAssignProcess
                }
              >
                挂接{levelNames[nextLevel]}
              </Button>
            </div>
          ) : (
            <div className='rounded-[20px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-3 text-[10px] font-black tracking-widest text-amber-700 uppercase'>
              当前没有可用的{levelNames[nextLevel]}可供挂接。
            </div>
          )
        ) : (
          <div className='rounded-[20px] border border-dashed border-muted/40 bg-muted/5 px-4 py-3 text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            请使用脑图上方工具条新增{levelNames[nextLevel]}
            ，编辑弹窗继续承接详情与结构写回。
          </div>
        )
      ) : (
        <div className='rounded-[20px] border border-dashed border-muted/40 bg-muted/5 px-4 py-3 text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
          当前节点已经是末级节点
        </div>
      )}
    </div>
  )
}
