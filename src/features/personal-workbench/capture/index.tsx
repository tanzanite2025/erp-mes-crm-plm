import { useEffect, useState } from 'react'
import { Camera, Video } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PersonalWorkbenchCardEditor } from '../components/personal-workbench-card-editor'
import { PersonalWorkbenchImagePicker } from '../components/personal-workbench-image-picker'
import { usePersonalWorkbenchBottomDrawerStore } from '../hooks/use-personal-workbench-bottom-drawer-store'
import type { PersonalRecordUpsertPayload } from '../data/schema'
import { useLocalMediaDrafts } from '../hooks/use-local-media-drafts'
import { usePersonalWorkbenchMutations } from '../hooks/use-personal-workbench'

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
  const [mediaUrl, setMediaUrl] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(
    autoOpenEditor && !!initialDraftId
  )
  const [activeDraftId, setActiveDraftId] = useState<string | null>(
    initialDraftId
  )
  const { getDraftById, updateDraft } = useLocalMediaDrafts()
  const { createMutation } = usePersonalWorkbenchMutations()
  const openPersonalWorkbenchBottomDrawer =
    usePersonalWorkbenchBottomDrawerStore(
      (state) => state.openPersonalWorkbenchBottomDrawer
    )
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
      <Header fixed className='z-50 border-b-0 shadow-none' />
      <div className='h-12 border-b border-dashed bg-background md:h-[52px]'>
        <div className='flex h-full items-center justify-between gap-4 px-4'>
          <div className='flex min-w-0 items-center gap-2'>
            {isVideoMode ? (
              <Video className='size-4 shrink-0 text-primary' />
            ) : (
              <Camera className='size-4 shrink-0 text-primary' />
            )}
            <div className='min-w-0'>
              <p className='text-[10px] font-black tracking-[0.24em] text-muted-foreground/60 uppercase'>
                独立新建入口
              </p>
              <p className='truncate text-sm font-black tracking-tight italic'>
                {isVideoMode ? '新建录像记录' : '新建拍照记录'}
              </p>
            </div>
          </div>
          <Badge variant='outline'>当前账号隔离</Badge>
        </div>
      </div>
      <Main className='flex-1 overflow-y-auto pt-0 pb-5'>
        <div className='flex min-h-0 w-full flex-col gap-4'>
          <div className='rounded-[32px] border border-dashed border-primary/20 bg-background/80 p-5 shadow-sm'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              {isVideoMode ? (
                <Video className='size-4' />
              ) : (
                <Camera className='size-4' />
              )}
              {isVideoMode ? '新建录像页' : '新建拍照页'}
            </div>
            <p className='mt-3 text-sm font-bold text-foreground'>
              {isVideoMode
                ? '当前页面仅用于新建一条个人录像记录。完成录制后，会直接打开本次新建记录的编辑器。'
                : '当前页面仅用于新建一条个人拍照记录。完成拍摄后，会直接打开本次新建记录的编辑器。'}
            </p>
            <div className='mt-4'>
              <PersonalWorkbenchImagePicker
                autoStartCamera
                autoPrepareRecording={isVideoMode}
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
                <Button
                  type='button'
                  variant='outline'
                  className='rounded-full'
                  onClick={() => setMediaUrl('')}
                >
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
            await updateDraft({
              ...currentDraft,
              linkedRecordAt: new Date().toISOString(),
              status: 'linked_to_record',
            })
          }
          setActiveDraftId(null)
          toast.success('个人记录已保存，正在打开个人记录底部抽屉')
          openPersonalWorkbenchBottomDrawer()
        }}
      />
    </>
  )
}
