import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Camera, Video } from 'lucide-react'
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
  autoOpenEditor?: boolean
  initialDraftId?: string | null
  mode: 'photo' | 'video'
}

export default function PersonalWorkbenchCapturePage({
  autoOpenEditor = false,
  initialDraftId = null,
  mode,
}: PersonalWorkbenchCapturePageProps) {
  const navigate = useNavigate()
  const [mediaUrl, setMediaUrl] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(autoOpenEditor && !!initialDraftId)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(initialDraftId)
  const { getDraftById, updateDraft } = useLocalMediaDrafts()
  const { createMutation } = usePersonalWorkbenchMutations()
  const isVideoMode = mode === 'video'

  useEffect(() => {
    setActiveDraftId(initialDraftId)
  }, [initialDraftId])

  useEffect(() => {
    if (!autoOpenEditor || !initialDraftId) {
      return
    }
    setIsEditorOpen(true)
  }, [autoOpenEditor, initialDraftId])

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
              {isVideoMode ? <Video className='size-4' /> : <Camera className='size-4' />}
              独立新建采集入口
            </div>
            <p className='mt-3 text-sm font-bold text-foreground'>
              {isVideoMode
                ? '当前入口仅用于新建一条个人录像记录。完成录制后，会直接打开本次新建的编辑器。'
                : '当前入口仅用于新建一条个人拍照记录。完成拍摄后，会直接打开本次新建的编辑器。'}
            </p>
            <div className='mt-4'>
              <PersonalWorkbenchImagePicker
                autoStartCamera
                autoPrepareRecording={isVideoMode}
                autoTriggerPhotoPicker={!isVideoMode}
                compactMode
                initialCaptureMode={mode}
                initialDraftId={activeDraftId}
                onDraftCreated={(draftId) => {
                  setActiveDraftId(draftId)
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
        initialDraftId={activeDraftId}
        open={isEditorOpen}
        onOpenChange={(nextOpen) => {
          setIsEditorOpen(nextOpen)
        }}
        onSubmit={async (payload: PersonalRecordUpsertPayload) => {
          await createMutation.mutateAsync(payload)
          setMediaUrl(payload.coverImageUrl)
          const currentDraft = getDraftById(activeDraftId)
          if (currentDraft) {
            await updateDraft({ ...currentDraft, linkedRecordAt: new Date().toISOString(), status: 'linked_to_record' })
          }
          setActiveDraftId(null)
          toast.success('个人记录已保存，正在返回个人缓冲区')
          void navigate({ to: '/personal-workbench' })
        }}
      />
    </>
  )
}
