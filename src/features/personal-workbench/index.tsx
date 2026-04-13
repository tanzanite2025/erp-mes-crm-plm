import { useMemo, useState } from 'react'
import { AlertTriangle, NotebookPen, Plus } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import type { PersonalRecord, PersonalRecordUpsertPayload } from './data/schema'
import { usePersonalWorkbenchMutations, usePersonalWorkbenchRecords } from './hooks/use-personal-workbench'
import { PersonalWorkbenchBoard } from './components/personal-workbench-board'
import { PersonalWorkbenchCardEditor } from './components/personal-workbench-card-editor'

export default function PersonalWorkbenchPage() {
  const { data, error, isError, isPending, refetch } = usePersonalWorkbenchRecords()
  const { createMutation, updateMutation } = usePersonalWorkbenchMutations()
  const [editingRecord, setEditingRecord] = useState<PersonalRecord | undefined>(undefined)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const records = useMemo(() => data?.items ?? [], [data?.items])

  return (
    <>
      <Header fixed className='border-b-0 shadow-none z-50' />
      <div className='h-12 md:h-[52px] bg-background border-b border-dashed'>
        <div className='flex h-full items-center justify-between gap-4 px-4'>
          <div className='flex items-center gap-2 min-w-0'>
            <NotebookPen className='size-4 text-primary shrink-0' />
            <div className='min-w-0'>
              <p className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>个人记录模块</p>
              <p className='text-sm font-black tracking-tight italic truncate'>个人记录缓冲区</p>
            </div>
          </div>
          <Button
            type='button'
            className='rounded-full shrink-0'
            onClick={() => {
              setEditingRecord(undefined)
              setIsEditorOpen(true)
            }}
          >
            <Plus className='size-4' />
            新建记录
          </Button>
        </div>
      </div>
      <Main className='flex-1 overflow-y-auto pt-0 pb-5'>
        <div className='flex flex-col items-stretch animate-in fade-in duration-700 min-h-0 min-w-0 h-fit p-4 md:p-8 gap-4'>
          <PageHeader
            title='个人记录缓冲区'
            description='只属于你自己的图片与碎片记录空间'
            icon={NotebookPen}
          />
          {isError ? (
            <div className='flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-amber-300 bg-amber-50/70 p-6'>
              <div className='flex max-w-md flex-col items-center text-center'>
                <AlertTriangle className='size-8 text-amber-600' />
                <p className='mt-3 text-base font-black tracking-tight text-foreground'>个人记录页面暂时无法加载</p>
                <p className='mt-2 text-sm text-muted-foreground'>
                  {error instanceof Error ? error.message : '接口当前不可用，请稍后重试。'}
                </p>
                <Button type='button' className='mt-4 rounded-full' onClick={() => void refetch()}>
                  重新加载
                </Button>
              </div>
            </div>
          ) : isPending ? (
            <div className='flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-muted/10 p-6 text-sm font-bold text-muted-foreground'>
              正在加载个人记录缓冲区…
            </div>
          ) : (
            <PersonalWorkbenchBoard
              hideCreateAction
              hideHeading
              records={records}
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
        </div>
      </Main>
      <PersonalWorkbenchCardEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        record={editingRecord}
        onSubmit={async (payload: PersonalRecordUpsertPayload, recordId?: string) => {
          if (recordId) {
            await updateMutation.mutateAsync({ id: recordId, payload })
            return
          }
          await createMutation.mutateAsync(payload)
        }}
      />
    </>
  )
}
