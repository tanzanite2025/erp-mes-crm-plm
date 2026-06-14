import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { personalWorkbenchColumns } from '../data/constants'
import type {
  PersonalRecord,
  PersonalRecordUpsertPayload,
} from '../data/schema'
import { PersonalWorkbenchImagePicker } from './personal-workbench-image-picker'

interface PersonalWorkbenchCardEditorProps {
  initialDraftId?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: PersonalRecord
  onSubmit: (
    payload: PersonalRecordUpsertPayload,
    recordId?: string
  ) => Promise<void>
}

export function PersonalWorkbenchCardEditor({
  initialDraftId = null,
  open,
  onOpenChange,
  record,
  onSubmit,
}: PersonalWorkbenchCardEditorProps) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [columnKey, setColumnKey] =
    useState<(typeof personalWorkbenchColumns)[number]['key']>('INBOX')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(record?.title ?? '')
    setNote(record?.note ?? '')
    setColumnKey(record?.columnKey ?? 'INBOX')
    setCoverImageUrl(record?.coverImageUrl ?? '')
  }, [open, record])

  const payload = useMemo<PersonalRecordUpsertPayload>(
    () => ({
      title,
      note,
      columnKey,
      sortOrder: record?.sortOrder ?? 0,
      coverImageUrl,
      assets: coverImageUrl
        ? [
            {
              storagePath: coverImageUrl,
              mimeType: 'image/webp',
              width: 0,
              height: 0,
              sizeBytes: 0,
            },
          ]
        : [],
    }),
    [columnKey, coverImageUrl, note, record?.sortOrder, title]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl overflow-hidden rounded-[32px] border-none p-0 shadow-2xl'>
        <div className='space-y-6 p-6'>
          <DialogHeader>
            <DialogTitle className='text-lg font-black tracking-tight uppercase italic'>
              {record ? '编辑个人记录' : '新建个人记录'}
            </DialogTitle>
            <DialogDescription className='text-[10px] font-black tracking-widest uppercase opacity-60'>
              {initialDraftId
                ? '已带入刚采集的现场媒体，请补充记录信息后保存'
                : '仅保存在你自己的个人缓冲区中'}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 md:grid-cols-[1.2fr_0.8fr]'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <span className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  标题
                </span>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder='这条记录想记什么？'
                />
              </div>
              <div className='space-y-2'>
                <span className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  备注
                </span>
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder='写一点背景、想法或后续提醒'
                  className='min-h-36'
                />
              </div>
              <div className='space-y-2'>
                <span className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  所在分栏
                </span>
                <Select
                  value={columnKey}
                  onValueChange={(value) =>
                    setColumnKey(value as typeof columnKey)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='选择分栏' />
                  </SelectTrigger>
                  <SelectContent>
                    {personalWorkbenchColumns.map((column) => (
                      <SelectItem key={column.key} value={column.key}>
                        {column.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <PersonalWorkbenchImagePicker
              initialDraftId={initialDraftId}
              value={coverImageUrl}
              onChange={setCoverImageUrl}
            />
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='ghost'
              className='rounded-full'
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type='button'
              className='rounded-full'
              disabled={isSaving || title.trim() === ''}
              onClick={async () => {
                try {
                  setIsSaving(true)
                  await onSubmit(payload, record?.id)
                  onOpenChange(false)
                } finally {
                  setIsSaving(false)
                }
              }}
            >
              {isSaving ? '保存中' : '保存'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
