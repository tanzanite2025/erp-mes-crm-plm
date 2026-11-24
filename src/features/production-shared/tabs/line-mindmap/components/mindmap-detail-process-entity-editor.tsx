import { useState } from 'react'
import { failLoudly } from '@/lib/safe-catch'
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
import type { ProductionBOMBranchOperation } from '../../../data/production-line'
import type { MindmapLevel } from '../data/line-mindmap-domain'

interface MindmapDetailProcessEntityEditorProps {
  levelNames: Record<MindmapLevel, string>
  processEntity: ProductionBOMBranchOperation
  onSaveProcessEntity?: (
    process: ProductionBOMBranchOperation
  ) => void | Promise<unknown>
}

export function MindmapDetailProcessEntityEditor({
  levelNames,
  processEntity,
  onSaveProcessEntity,
}: MindmapDetailProcessEntityEditorProps) {
  const [processEntityDraft, setProcessEntityDraft] =
    useState<ProductionBOMBranchOperation>({ ...processEntity })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function saveBranchOperationAndPreserveDraftOnFailure() {
    if (!onSaveProcessEntity || isSaving) return
    setIsSaving(true)
    setSaveError(null)
    try {
      await onSaveProcessEntity(processEntityDraft)
    } catch (error) {
      failLoudly(
        error,
        'MindmapDetailProcessEntityEditor.saveBranchOperation',
        {
          silentUI: true,
        }
      )
      setSaveError(
        error instanceof Error ? error.message : '工序保存失败，请重试'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <fieldset
      disabled={isSaving}
      className='min-w-0 space-y-3 border-t border-dashed border-muted/40 pt-4'
    >
      <div className='text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
        {levelNames[3]}工序
      </div>
      <Input
        value={processEntityDraft.name}
        onChange={(event) =>
          setProcessEntityDraft((current) => ({
            ...current,
            name: event.target.value,
          }))
        }
        placeholder={`输入${levelNames[3]}名称`}
        className='h-11 rounded-2xl border-none bg-background/80'
      />
      <Textarea
        value={processEntityDraft.description}
        onChange={(event) =>
          setProcessEntityDraft((current) => ({
            ...current,
            description: event.target.value,
          }))
        }
        placeholder={`补充${levelNames[3]}说明`}
        className='min-h-24 rounded-[24px] border-none bg-background/80'
      />
      <Select
        disabled={isSaving}
        value={processEntityDraft.isActive ? 'active' : 'inactive'}
        onValueChange={(value) =>
          setProcessEntityDraft((current) => ({
            ...current,
            isActive: value === 'active',
          }))
        }
      >
        <SelectTrigger className='h-11 rounded-2xl border-none bg-background/80'>
          <SelectValue placeholder='选择启用状态' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='active'>启用</SelectItem>
          <SelectItem value='inactive'>停用</SelectItem>
        </SelectContent>
      </Select>
      {saveError ? (
        <p role='alert' className='text-sm text-destructive'>
          {saveError}
        </p>
      ) : null}
      <Button
        type='button'
        className='h-11 w-full rounded-full px-5'
        onClick={() => void saveBranchOperationAndPreserveDraftOnFailure()}
        disabled={
          isSaving || !processEntityDraft.name.trim() || !onSaveProcessEntity
        }
      >
        {isSaving ? '正在保存…' : `保存${levelNames[3]}工序`}
      </Button>
    </fieldset>
  )
}
