import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { personalWorkbenchColumns } from '../data/constants'
import type { PersonalRecord } from '../data/schema'
import { usePersonalWorkbenchMutations } from '../hooks/use-personal-workbench'
import { reorderPersonalRecords } from '../utils/record-reorder'
import { PersonalWorkbenchColumn } from './personal-workbench-column'

interface PersonalWorkbenchBoardProps {
  hideCreateAction?: boolean
  hideHeading?: boolean
  records: PersonalRecord[]
  onCreate: () => void
  onEdit: (record: PersonalRecord) => void
}

export function PersonalWorkbenchBoard({
  hideCreateAction = false,
  hideHeading = false,
  records,
  onCreate,
  onEdit,
}: PersonalWorkbenchBoardProps) {
  const { reorderMutation } = usePersonalWorkbenchMutations()
  const [draggingRecordId, setDraggingRecordId] = useState<string | null>(null)
  const [displayRecords, setDisplayRecords] = useState<PersonalRecord[]>(records)

  useEffect(() => {
    setDisplayRecords(records)
  }, [records])

  const recordsByColumn = useMemo(() => {
    return personalWorkbenchColumns.map((column) => ({
      ...column,
      records: displayRecords.filter((record) => record.columnKey === column.key),
    }))
  }, [displayRecords])

  const handleDropToColumn = async (
    columnKey: (typeof personalWorkbenchColumns)[number]['key'],
    index: number
  ) => {
    if (!draggingRecordId) {
      return
    }
    const previousRecords = displayRecords
    const result = reorderPersonalRecords(displayRecords, draggingRecordId, { columnKey, index })
    setDraggingRecordId(null)
    if (result.updates.length === 0) {
      return
    }
    setDisplayRecords(result.records)
    try {
      await reorderMutation.mutateAsync(result.updates)
    } catch (error) {
      setDisplayRecords(previousRecords)
      const message = error instanceof Error ? error.message : '个人记录排序失败'
      toast.error(message)
    }
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          {!hideHeading && <h2 className='text-lg font-black uppercase tracking-tight italic'>个人记录缓冲区</h2>}
          {!hideHeading && <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>仅自己可见</p>}
        </div>
        {!hideCreateAction && (
          <Button type='button' className='rounded-full' onClick={onCreate}>
            <Plus className='mr-2 size-4' />
            新建记录
          </Button>
        )}
      </div>
      <ScrollArea className='flex-1'>
        <div className='grid gap-4 xl:grid-cols-4 md:grid-cols-2'>
          {recordsByColumn.map((column) => (
            <PersonalWorkbenchColumn
              key={column.key}
              columnKey={column.key}
              draggingRecordId={draggingRecordId}
              onCardDragEnd={() => setDraggingRecordId(null)}
              onCardDragStart={(record) => setDraggingRecordId(record.id)}
              onDropToColumn={handleDropToColumn}
              records={column.records}
              onEdit={onEdit}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
