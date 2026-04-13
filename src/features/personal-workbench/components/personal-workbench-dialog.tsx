import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PersonalWorkbenchBoard } from './personal-workbench-board'
import { PersonalWorkbenchCardEditor } from './personal-workbench-card-editor'
import type { PersonalRecord, PersonalRecordUpsertPayload } from '../data/schema'
import { usePersonalWorkbenchDialogStore } from '../hooks/use-personal-workbench-dialog-store'
import { usePersonalWorkbenchMutations, usePersonalWorkbenchRecords } from '../hooks/use-personal-workbench'

export function PersonalWorkbenchDialog() {
  const navigate = useNavigate()
  const open = usePersonalWorkbenchDialogStore((state) => state.open)
  const setOpen = usePersonalWorkbenchDialogStore((state) => state.setOpen)
  const { data } = usePersonalWorkbenchRecords()
  const { createMutation, updateMutation } = usePersonalWorkbenchMutations()
  const [editingRecord, setEditingRecord] = useState<PersonalRecord | undefined>(undefined)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const records = useMemo(() => data?.items ?? [], [data?.items])

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-w-[95vw] h-[88vh] rounded-[32px] border-none p-0 shadow-2xl overflow-hidden'>
          <div className='flex h-full flex-col p-6 pt-12'>
            <DialogHeader className='sr-only'>
              <DialogTitle>个人记录缓冲区</DialogTitle>
              <DialogDescription>查看和整理仅自己可见的个人图片与碎片记录。</DialogDescription>
            </DialogHeader>
            <div className='mb-4 flex items-start justify-between gap-4 pr-10'>
              <div>
                <h2 className='text-lg font-black uppercase tracking-tight italic'>个人记录缓冲区</h2>
                <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>仅自己可见</p>
              </div>
              <button
                type='button'
                className='inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary'
                onClick={() => {
                  setOpen(false)
                  navigate({ to: '/personal-workbench' })
                }}
              >
                打开完整页面
                <ArrowUpRight className='size-3.5' />
              </button>
            </div>
            <PersonalWorkbenchBoard
              records={records}
              hideHeading
              onCreate={() => {
                setEditingRecord(undefined)
                setIsEditorOpen(true)
              }}
              onEdit={(record) => {
                setEditingRecord(record)
                setIsEditorOpen(true)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
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
