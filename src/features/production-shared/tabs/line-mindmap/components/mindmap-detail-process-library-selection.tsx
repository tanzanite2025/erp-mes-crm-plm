import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ProductionProcessStep } from '../../../data/production-process'
import type { LineMindmapNode } from '../data/line-mindmap-domain'

interface MindmapDetailProcessLibrarySelectionProps {
  selectedNode: LineMindmapNode
  standardProcesses: ProductionProcessStep[]
  onSaveProcessSelection?: (
    segmentId: string,
    processLibraryIds: string[]
  ) => void | Promise<unknown>
}

export function MindmapDetailProcessLibrarySelection({
  selectedNode,
  standardProcesses,
  onSaveProcessSelection,
}: MindmapDetailProcessLibrarySelectionProps) {
  const currentSelection = useMemo(
    () =>
      (selectedNode.readonlyMeta?.branchOperations ?? [])
        .map((operation) => operation.processLibraryId)
        .filter((id): id is string => Boolean(id)),
    [selectedNode.readonlyMeta?.branchOperations]
  )
  const [selectedProcessLibraryIds, setSelectedProcessLibraryIds] =
    useState(currentSelection)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setSelectedProcessLibraryIds(currentSelection)
    setSaveError(null)
  }, [currentSelection])

  if (selectedNode.sourceType !== 'segment' || !selectedNode.sourceId) {
    return null
  }

  const activeProcesses = standardProcesses.filter(
    (process) => process.isActive !== false
  )
  const selectedIdSet = new Set(selectedProcessLibraryIds)

  async function saveSelection() {
    if (!onSaveProcessSelection || isSaving) return
    setIsSaving(true)
    setSaveError(null)
    try {
      await onSaveProcessSelection(
        selectedNode.sourceId!,
        selectedProcessLibraryIds
      )
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : '工序选配保存失败，请重试'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='space-y-2'>
      <p className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
        L2 工序选配
      </p>
      <div className='space-y-3 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
        <p className='text-xs text-muted-foreground'>
          从工序库选择该 MBOM 分支允许使用的 L3 工序。选择只影响当前稳定分支。
        </p>
        <div className='grid gap-2'>
          {activeProcesses.map((process) => {
            const checked = selectedIdSet.has(process.id)
            return (
              <label
                key={process.id}
                className='flex min-w-0 cursor-pointer items-start gap-3 rounded-2xl border bg-background/70 px-3 py-3'
              >
                <input
                  type='checkbox'
                  checked={checked}
                  disabled={isSaving || !onSaveProcessSelection}
                  onChange={() =>
                    setSelectedProcessLibraryIds((current) =>
                      checked
                        ? current.filter((id) => id !== process.id)
                        : [...current, process.id]
                    )
                  }
                  className='mt-1 size-4 accent-primary'
                />
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-sm font-semibold'>
                    {process.name}
                  </span>
                  <span className='block truncate text-xs text-muted-foreground'>
                    {[process.code, process.description]
                      .filter(Boolean)
                      .join(' · ') || '暂无说明'}
                  </span>
                </span>
              </label>
            )
          })}
          {activeProcesses.length === 0 ? (
            <p className='rounded-2xl bg-background/70 p-4 text-xs text-muted-foreground'>
              工序库暂无启用工序，请先在工序库 TAB 配置。
            </p>
          ) : null}
        </div>
        {saveError ? (
          <p role='alert' className='text-sm text-destructive'>
            {saveError}
          </p>
        ) : null}
        <Button
          type='button'
          className='h-11 w-full rounded-full'
          disabled={isSaving || !onSaveProcessSelection}
          onClick={() => void saveSelection()}
        >
          {isSaving ? '正在保存选配…' : '保存 L2 工序选配'}
        </Button>
      </div>
    </div>
  )
}
