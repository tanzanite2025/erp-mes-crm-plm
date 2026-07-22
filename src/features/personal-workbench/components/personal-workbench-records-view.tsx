import { useMemo, useState } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  PersonalRecord,
  PersonalRecordUpsertPayload,
} from '../data/schema'
import {
  usePersonalWorkbenchMutations,
  usePersonalWorkbenchRecords,
} from '../hooks/use-personal-workbench'
import { PersonalWorkbenchBoard } from './personal-workbench-board'
import { PersonalWorkbenchCardEditor } from './personal-workbench-card-editor'

interface PersonalWorkbenchRecordsViewProps {
  isCompactLayout?: boolean
  searchQuery: string
}

export function PersonalWorkbenchRecordsView({
  isCompactLayout = false,
  searchQuery,
}: PersonalWorkbenchRecordsViewProps) {
  const { data, error, isError, isPending, refetch } =
    usePersonalWorkbenchRecords()
  const { createMutation, updateMutation } = usePersonalWorkbenchMutations()
  const [editingRecord, setEditingRecord] = useState<
    PersonalRecord | undefined
  >(undefined)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const records = useMemo(() => data?.items ?? [], [data?.items])
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredRecords = useMemo(() => {
    if (!normalizedQuery) {
      return records
    }
    return records.filter((record) => {
      const haystack = [record.title, record.note, record.columnKey]
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [normalizedQuery, records])

  return (
    <div className='flex min-h-0 flex-1 flex-col items-stretch gap-2'>
      <div className='flex items-center justify-end'>
        <Button
          type='button'
          className='h-8 shrink-0 rounded-full px-3 text-[10px] font-black tracking-widest md:h-9 md:px-4 md:text-[11px]'
          onClick={() => {
            setEditingRecord(undefined)
            setIsEditorOpen(true)
          }}
        >
          <Plus className='size-3.5' />
          新建记录
        </Button>
      </div>
      {isError ? (
        <div className='flex min-h-0 flex-1 items-center justify-center rounded-[28px] border border-dashed border-amber-300 bg-amber-50/70 p-6'>
          <div className='flex max-w-md flex-col items-center text-center'>
            <AlertTriangle className='size-8 text-amber-600' />
            <p className='mt-3 text-base font-black tracking-tight text-foreground'>
              个人记录底部抽屉暂时无法加载
            </p>
            <p className='mt-2 text-sm text-muted-foreground'>
              {error instanceof Error
                ? error.message
                : '接口当前不可用，请稍后重试。'}
            </p>
            <Button
              type='button'
              className='mt-4 rounded-full'
              onClick={() => void refetch()}
            >
              重新加载
            </Button>
          </div>
        </div>
      ) : isPending ? (
        <div className='flex min-h-0 flex-1 items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-muted/10 p-6 text-sm font-bold text-muted-foreground'>
          正在加载个人记录缓冲区…
        </div>
      ) : filteredRecords.length === 0 && records.length > 0 ? (
        <div className='flex min-h-0 flex-1 items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-muted/10 p-6 text-center'>
          <div className='max-w-md'>
            <p className='text-base font-black tracking-tight text-foreground'>
              未找到匹配的个人记录
            </p>
            <p className='mt-2 text-sm text-muted-foreground'>
              当前搜索只会在你自己的个人记录中查找标题、内容和状态列。
            </p>
          </div>
        </div>
      ) : (
        <PersonalWorkbenchBoard
          isCompactLayout={isCompactLayout}
          hideCreateAction
          hideHeading
          records={filteredRecords}
          onCreate={() => {
            setEditingRecord(undefined)
            setIsEditorOpen(true)
          }}
          onEdit={(record) => {
            setEditingRecord(record)
            setIsEditorOpen(true)
          }}
        />
      )}
      <PersonalWorkbenchCardEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        record={editingRecord}
        onSubmit={async (
          payload: PersonalRecordUpsertPayload,
          recordId?: string
        ) => {
          if (recordId) {
            await updateMutation.mutateAsync({ id: recordId, payload })
            return
          }
          await createMutation.mutateAsync(payload)
        }}
      />
    </div>
  )
}
