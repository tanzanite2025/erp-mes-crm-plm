import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Camera, NotebookPen, Video } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { PersonalRecordUpsertPayload } from '../data/schema'
import { useLocalMediaDrafts } from '../hooks/use-local-media-drafts'
import { usePersonalWorkbenchMutations } from '../hooks/use-personal-workbench'
import { PersonalWorkbenchCardEditor } from '../components/personal-workbench-card-editor'
import { PersonalWorkbenchImagePicker } from '../components/personal-workbench-image-picker'

interface PersonalWorkbenchCapturePageProps {
  mode: 'photo' | 'video'
}

export default function PersonalWorkbenchCapturePage({ mode }: PersonalWorkbenchCapturePageProps) {
  const navigate = useNavigate()
  const [mediaUrl, setMediaUrl] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [pendingDraftId, setPendingDraftId] = useState<string | null>(null)
  const { clearLinkedDrafts, drafts, reprioritizeDraft, updateDraft } = useLocalMediaDrafts()
  const { createMutation } = usePersonalWorkbenchMutations()
  const isVideoMode = mode === 'video'

  const queuedDrafts = useMemo(
    () => drafts.filter((draft) => draft.status === 'local_draft' || draft.status === 'uploaded'),
    [drafts]
  )

  const activeQueuedDraftId = pendingDraftId ?? queuedDrafts[0]?.id ?? null

  const remainingQueueCount = useMemo(
    () => queuedDrafts.filter((draft) => draft.id !== activeQueuedDraftId).length,
    [activeQueuedDraftId, queuedDrafts]
  )

  const currentQueueDraft = useMemo(
    () => queuedDrafts.find((draft) => draft.id === activeQueuedDraftId) ?? null,
    [activeQueuedDraftId, queuedDrafts]
  )

  const maxQueuePriority = useMemo(
    () => queuedDrafts.reduce((max, draft) => Math.max(max, draft.queuePriority ?? 0), 0),
    [queuedDrafts]
  )

  const minQueuePriority = useMemo(
    () => queuedDrafts.reduce((min, draft) => Math.min(min, draft.queuePriority ?? 0), 0),
    [queuedDrafts]
  )

  return (
    <>
      <Header fixed className='border-b-0 shadow-none z-50' />
      <div className='h-12 md:h-[52px] bg-background border-b border-dashed'>
        <div className='flex h-full items-center justify-between gap-4 px-4'>
          <div className='flex items-center gap-2 min-w-0'>
            {isVideoMode ? <Video className='size-4 text-primary shrink-0' /> : <Camera className='size-4 text-primary shrink-0' />}
            <div className='min-w-0'>
              <p className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>个人快捷采集</p>
              <p className='text-sm font-black tracking-tight italic truncate'>{isVideoMode ? '一键录视频' : '一键拍照'}</p>
            </div>
          </div>
          <Badge variant='outline'>当前账号隔离</Badge>
        </div>
      </div>
      <Main className='flex-1 overflow-y-auto pt-0 pb-5'>
        <div className='mx-auto flex min-h-0 w-full max-w-3xl flex-col gap-4 p-4 md:p-8'>
          <div className='rounded-[32px] border border-dashed border-primary/20 bg-background/80 p-5 shadow-sm'>
            <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              <NotebookPen className='size-4' />
              个人缓冲区快捷入口
            </div>
            {queuedDrafts.length > 0 ? (
              <div className='mt-3 flex flex-wrap items-center gap-2'>
                <Badge variant='secondary'>待整理草稿 {queuedDrafts.length}</Badge>
                {remainingQueueCount > 0 ? <Badge variant='outline'>当前完成后还剩 {remainingQueueCount} 条</Badge> : null}
              </div>
            ) : null}
            {currentQueueDraft ? (
              <div className='mt-3 flex flex-wrap gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='rounded-full'
                  onClick={async () => {
                    await reprioritizeDraft(currentQueueDraft.id, maxQueuePriority + 1)
                    toast.success('当前草稿已置顶，会优先整理')
                  }}
                >
                  置顶当前
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='rounded-full'
                  onClick={async () => {
                    await reprioritizeDraft(currentQueueDraft.id, minQueuePriority - 1)
                    setPendingDraftId(null)
                    toast.success('当前草稿已稍后处理，已切换下一条')
                  }}
                >
                  稍后处理
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='rounded-full'
                  onClick={async () => {
                    const cleared = await clearLinkedDrafts()
                    toast.success(cleared > 0 ? `已清理 ${cleared} 条已整理草稿` : '当前没有可清理的已整理草稿')
                  }}
                >
                  清理已整理
                </Button>
              </div>
            ) : null}
            <p className='mt-3 text-sm font-bold text-foreground'>
              {isVideoMode
                ? '当前入口会直接进入录视频准备态。你确认后开始录制，结果会进入你自己的个人缓冲区草稿链。'
                : '当前入口会自动尝试拉起系统拍照入口，拍摄结果会直接进入你自己的个人缓冲区草稿链。'}
            </p>
            <div className='mt-4'>
              <PersonalWorkbenchImagePicker
                autoStartCamera
                autoPrepareRecording={isVideoMode}
                autoTriggerPhotoPicker={!isVideoMode}
                compactMode
                initialCaptureMode={mode}
                initialDraftId={activeQueuedDraftId}
                onDraftCreated={(draftId) => {
                  setPendingDraftId(draftId)
                  setIsEditorOpen(true)
                }}
                value={mediaUrl}
                onChange={setMediaUrl}
              />
            </div>
            {mediaUrl ? (
              <div className='mt-4 flex justify-end'>
                <Button type='button' variant='outline' className='rounded-full' onClick={() => setMediaUrl('')}>
                  清空当前已上传媒体引用
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </Main>
      <PersonalWorkbenchCardEditor
        initialDraftId={activeQueuedDraftId}
        open={isEditorOpen}
        onOpenChange={(nextOpen) => {
          setIsEditorOpen(nextOpen)
          if (!nextOpen) {
            setPendingDraftId(null)
          }
        }}
        onSubmit={async (payload: PersonalRecordUpsertPayload) => {
          await createMutation.mutateAsync(payload)
          setMediaUrl(payload.coverImageUrl)
          const savedDraftId = activeQueuedDraftId
          const currentDraft = drafts.find((draft) => draft.id === savedDraftId) ?? null
          if (currentDraft) {
            await updateDraft({ ...currentDraft, linkedRecordAt: new Date().toISOString(), status: 'linked_to_record' })
          }

          const nextDraft = queuedDrafts.find((draft) => draft.id !== savedDraftId) ?? null
          if (nextDraft) {
            setPendingDraftId(nextDraft.id)
            toast.success(`个人记录已保存，继续整理下一条草稿（剩余 ${Math.max(remainingQueueCount - 1, 0)} 条）`)
            return
          }

          setPendingDraftId(null)
          toast.success('个人记录已保存，待整理草稿已处理完成，正在返回个人缓冲区')
          void navigate({ to: '/personal-workbench' })
        }}
      />
    </>
  )
}
