import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  PersonalRecord,
  PersonalRecordUpsertPayload,
} from '../data/schema'
import {
  usePersonalWorkbenchMutations,
  usePersonalWorkbenchRecords,
} from '../hooks/use-personal-workbench'
import { usePersonalWorkbenchDialogStore } from '../hooks/use-personal-workbench-dialog-store'
import { PersonalWorkbenchBoard } from './personal-workbench-board'
import { PersonalWorkbenchCardEditor } from './personal-workbench-card-editor'

export function PersonalWorkbenchDialog() {
  const navigate = useNavigate()
  const open = usePersonalWorkbenchDialogStore((state) => state.open)
  const setOpen = usePersonalWorkbenchDialogStore((state) => state.setOpen)
  const { data, error, isError, isPending, refetch } =
    usePersonalWorkbenchRecords()
  const { createMutation, updateMutation } = usePersonalWorkbenchMutations()
  const [editingRecord, setEditingRecord] = useState<
    PersonalRecord | undefined
  >(undefined)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const records = useMemo(() => data?.items ?? [], [data?.items])

  const openEditor = (record?: PersonalRecord) => {
    setEditingRecord(record)
    setOpen(false)
    setIsEditorOpen(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='h-[88vh] max-w-[95vw] overflow-hidden rounded-[32px] border-none p-0 shadow-2xl'>
          <div className='flex h-full flex-col p-6 pt-12'>
            <DialogHeader className='sr-only'>
              <DialogTitle>个人记录缓冲区</DialogTitle>
              <DialogDescription>
                查看和整理仅自己可见的个人图片与碎片记录。
              </DialogDescription>
            </DialogHeader>
            <div className='mb-4 flex items-start justify-between gap-4 pr-10'>
              <div>
                <h2 className='text-lg font-black tracking-tight uppercase italic'>
                  个人记录缓冲区
                </h2>
                <p className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                  仅自己可见
                </p>
              </div>
              <button
                type='button'
                className='inline-flex items-center gap-1 text-[10px] font-black tracking-widest text-primary uppercase'
                onClick={() => {
                  setOpen(false)
                  navigate({ to: '/personal-workbench' })
                }}
              >
                打开完整页面
                <ArrowUpRight className='size-3.5' />
              </button>
            </div>
            {isError ? (
              <div className='flex h-full min-h-0 flex-1 items-center justify-center rounded-[28px] border border-dashed border-amber-300 bg-amber-50/70 p-6'>
                <div className='flex max-w-md flex-col items-center text-center'>
                  <AlertTriangle className='size-8 text-amber-600' />
                  <p className='mt-3 text-sm font-black tracking-tight text-foreground'>
                    个人缓冲区暂时无法加载
                  </p>
                  <p className='mt-2 text-[11px] font-medium text-muted-foreground'>
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
              <div className='flex h-full min-h-0 flex-1 items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-muted/10 p-6 text-[11px] font-bold text-muted-foreground'>
                正在加载个人缓冲区…
              </div>
            ) : (
              <PersonalWorkbenchBoard
                records={records}
                hideHeading
                onCreate={() => openEditor(undefined)}
                onEdit={(record) => openEditor(record)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <PersonalWorkbenchCardEditor
        open={isEditorOpen}
        onOpenChange={(nextOpen) => {
          setIsEditorOpen(nextOpen)
          if (!nextOpen) {
            setEditingRecord(undefined)
          }
        }}
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
    </>
  )
}
