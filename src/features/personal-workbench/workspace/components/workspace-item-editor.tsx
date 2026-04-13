import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { PersonalWorkspaceItem, PersonalWorkspaceItemDraft, PersonalWorkspaceItemType } from '../data/schema'

interface WorkspaceItemEditorProps {
  item?: PersonalWorkspaceItem
  open: boolean
  type: PersonalWorkspaceItemType
  onOpenChange: (open: boolean) => void
  onSubmit: (draft: PersonalWorkspaceItemDraft, itemId?: string) => Promise<void>
}

export function WorkspaceItemEditor({ item, open, type, onOpenChange, onSubmit }: WorkspaceItemEditorProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [remark, setRemark] = useState('')
  const [url, setUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setTitle(item?.title ?? '')
    setContent(item?.type === 'note' ? item.content : '')
    setRemark(item?.type === 'link' ? item.remark : '')
    setUrl(item?.type === 'link' ? item.url : '')
  }, [item, open])

  const payload = useMemo<PersonalWorkspaceItemDraft>(() => ({
    content,
    remark,
    title,
    type,
    url,
  }), [content, remark, title, type, url])

  const submitDisabled = type === 'note'
    ? title.trim() === '' && content.trim() === ''
    : url.trim() === ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-xl rounded-[32px] border-none p-0 shadow-2xl overflow-hidden'>
        <div className='space-y-6 p-6'>
          <DialogHeader>
            <DialogTitle className='text-lg font-black tracking-tight'>{item ? `编辑${type === 'note' ? '便签' : '链接'}` : `新建${type === 'note' ? '便签' : '链接'}`}</DialogTitle>
            <DialogDescription className='text-[11px] font-medium text-muted-foreground'>
              {type === 'note' ? '把随手复制的文本、备注和个人上下文先贴在这里。' : '保存你常用的网站、后台入口和查询页，并补充备注说明。'}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='space-y-2'>
              <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>标题</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={type === 'note' ? '这张便签想记什么？' : '这条链接叫什么？'} />
            </div>
            {type === 'note' ? (
              <div className='space-y-2'>
                <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>内容</span>
                <Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder='把文本、备注或临时说明贴在这里' className='min-h-56 rounded-2xl bg-amber-50/50 p-4 text-sm leading-6' />
              </div>
            ) : (
              <>
                <div className='space-y-2'>
                  <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>URL</span>
                  <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder='https://example.com/path' />
                </div>
                <div className='space-y-2'>
                  <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>备注</span>
                  <Textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder='写一下这是哪个后台、什么时候用、要注意什么' className='min-h-36 rounded-2xl p-4 text-sm leading-6' />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type='button' variant='ghost' className='rounded-full' onClick={() => onOpenChange(false)}>取消</Button>
            <Button
              type='button'
              className='rounded-full'
              disabled={isSaving || submitDisabled}
              onClick={async () => {
                try {
                  setIsSaving(true)
                  await onSubmit(payload, item?.id)
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
