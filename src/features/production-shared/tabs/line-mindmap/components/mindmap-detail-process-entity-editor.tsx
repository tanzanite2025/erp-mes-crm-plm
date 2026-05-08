import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ProductionProcessStep } from '../../../data/production-process'
import type { MindmapLevel } from '../data/sample-mindmap'
import type { LineMindmapProcessDraft } from '../types'

interface MindmapDetailProcessEntityEditorProps {
  levelNames: Record<MindmapLevel, string>
  processEntity: ProductionProcessStep
  onDeleteProcessEntity?: (process: ProductionProcessStep) => void | Promise<void>
  onSaveProcessEntity?: (process: ProductionProcessStep) => void | Promise<void>
}

export function MindmapDetailProcessEntityEditor({
  levelNames,
  processEntity,
  onDeleteProcessEntity,
  onSaveProcessEntity,
}: MindmapDetailProcessEntityEditorProps) {
  const [processEntityDraft, setProcessEntityDraft] = useState<LineMindmapProcessDraft>({
    description: processEntity.description ?? '',
    isActive: processEntity.isActive ?? true,
    name: processEntity.name,
  })

  return (
    <div className='space-y-3 border-t border-dashed border-muted/40 pt-4'>
      <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/55'>
        {levelNames[3]}本体
      </div>
      <Input
        value={processEntityDraft.name}
        onChange={(event) => setProcessEntityDraft((current) => ({ ...current, name: event.target.value }))}
        placeholder={`输入${levelNames[3]}名称`}
        className='h-11 rounded-2xl border-none bg-background/80'
      />
      <Textarea
        value={processEntityDraft.description}
        onChange={(event) => setProcessEntityDraft((current) => ({ ...current, description: event.target.value }))}
        placeholder={`补充${levelNames[3]}说明`}
        className='min-h-24 rounded-[24px] border-none bg-background/80'
      />
      <Select
        value={processEntityDraft.isActive ? 'active' : 'inactive'}
        onValueChange={(value) => setProcessEntityDraft((current) => ({ ...current, isActive: value === 'active' }))}
      >
        <SelectTrigger className='h-11 rounded-2xl border-none bg-background/80'>
          <SelectValue placeholder='选择启用状态' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='active'>启用</SelectItem>
          <SelectItem value='inactive'>停用</SelectItem>
        </SelectContent>
      </Select>
      <div className='grid gap-3 sm:grid-cols-2'>
        <Button
          type='button'
          className='h-11 rounded-full px-5 text-[10px] font-black uppercase tracking-widest'
          onClick={() => {
            void onSaveProcessEntity?.({
              id: processEntity.id,
              code: processEntity.code,
              description: processEntityDraft.description,
              isActive: processEntityDraft.isActive,
              name: processEntityDraft.name,
            })
          }}
          disabled={!processEntityDraft.name.trim() || !onSaveProcessEntity}
        >
          保存{levelNames[3]}本体
        </Button>
        <Button
          type='button'
          variant='outline'
          className='h-11 rounded-full border-dashed border-rose-300 bg-rose-500/10 px-5 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:bg-rose-500/15 hover:text-rose-800'
          onClick={() => {
            void onDeleteProcessEntity?.({
              id: processEntity.id,
              code: processEntity.code,
              description: processEntity.description,
              isActive: processEntity.isActive,
              name: processEntity.name,
            })
          }}
          disabled={!onDeleteProcessEntity}
        >
          删除{levelNames[3]}本体
        </Button>
      </div>
    </div>
  )
}
