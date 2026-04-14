'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowRight, Download, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLanguage } from '@/context/language-provider'
import { useLocalMediaDrafts } from '@/features/personal-workbench/hooks/use-local-media-drafts'
import { usePageInstall } from '@/features/scan-platform/hooks/use-page-install'
import { useAuthStore } from '@/stores/auth-store'
import { getAvailableQuickActions } from '../services/quick-action-access'

interface QuickActionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickActionDrawer({ open, onOpenChange }: QuickActionDrawerProps) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const actions = useMemo(() => getAvailableQuickActions(user), [user])
  const { saveDraft } = useLocalMediaDrafts()
  const photoInstall = usePageInstall({ manifestHref: '/manifests/personal-workbench-photo.webmanifest' })
  const videoInstall = usePageInstall({ manifestHref: '/manifests/personal-workbench-video.webmanifest' })
  const bufferInstall = usePageInstall({ manifestHref: '/manifests/personal-workbench-buffer.webmanifest' })

  const installStateMap = useMemo(() => ({
    personal_workbench_photo: photoInstall,
    personal_workbench_video: videoInstall,
    personal_workbench_buffer: bufferInstall,
  }), [bufferInstall, photoInstall, videoInstall])

  const resolveInstallLabel = (installLabel: string) => {
    if (installLabel === 'ALREADY_INSTALLED') {
      return t('quickActions.drawer.install.installed')
    }
    if (installLabel === 'ADD_TO_HOME_SCREEN') {
      return t('quickActions.drawer.install.action')
    }
    return t('quickActions.drawer.install.guide')
  }

  const openDirectCapture = useCallback((mode: 'photo' | 'video') => {
    if (isCapturing) {
      return
    }

    if (mode === 'photo') {
      photoInputRef.current?.click()
      return
    }

    videoInputRef.current?.click()
  }, [isCapturing])

  const handleDirectCapture = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>,
    mode: 'photo' | 'video',
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setIsCapturing(true)
    try {
      const draft = await saveDraft({
        durationSeconds: mode === 'video' ? 10 : undefined,
        file,
        kind: mode === 'video' ? 'video' : 'image',
      })

      if (!draft) {
        toast.error(mode === 'video' ? '当前环境无法保存本地视频草稿' : '当前环境无法保存本地图片草稿')
        return
      }

      onOpenChange(false)
      void navigate({
        to: '/personal-workbench/capture',
        search: {
          autoEdit: true,
          draftId: draft.id,
          mode,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : mode === 'video' ? '拉起录视频失败' : '拉起拍照失败'
      toast.error(message)
    } finally {
      setIsCapturing(false)
    }
  }, [navigate, onOpenChange, saveDraft])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='w-[360px] gap-0 border-l border-primary/10 bg-background/95 p-0 backdrop-blur sm:max-w-[360px]'>
        <SheetHeader className='border-b border-dashed border-border/70 px-5 py-5 text-left'>
          <SheetTitle className='text-base font-black uppercase tracking-widest'>{t('quickActions.drawer.title')}</SheetTitle>
          <SheetDescription className='text-[11px] font-bold text-muted-foreground'>{t('quickActions.drawer.description')}</SheetDescription>
        </SheetHeader>

        <div className='flex flex-col gap-3 p-4'>
          {actions.length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 bg-muted/20 px-6 py-10 text-center'>
              <ShieldAlert className='mb-3 size-9 text-muted-foreground/40' />
              <p className='text-[11px] font-black uppercase tracking-widest text-foreground'>{t('quickActions.drawer.emptyTitle')}</p>
              <p className='mt-2 text-[11px] font-bold text-muted-foreground'>{t('quickActions.drawer.emptyDescription')}</p>
            </div>
          ) : (
            actions.map((action) => {
              const Icon = action.icon
              const installState = action.id in installStateMap ? installStateMap[action.id as keyof typeof installStateMap] : null
              return (
                <div
                  key={action.id}
                  className='group flex items-center justify-between rounded-3xl border border-border/70 bg-background px-4 py-4 text-left shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5'
                >
                  <button
                    type='button'
                    className='flex min-w-0 flex-1 items-center justify-between gap-3 text-left'
                    onClick={() => {
                      if (action.id === 'personal_workbench_photo') {
                        openDirectCapture('photo')
                        return
                      }

                      if (action.id === 'personal_workbench_video') {
                        openDirectCapture('video')
                        return
                      }

                      onOpenChange(false)
                      void navigate({ to: action.to, search: action.search })
                    }}
                  >
                    <div className='flex min-w-0 items-center gap-3'>
                      <div className='flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
                        <Icon className='size-5' />
                      </div>
                      <div className='min-w-0'>
                        <p className='truncate text-[12px] font-black uppercase tracking-widest text-foreground'>{t(action.titleKey)}</p>
                        <p className='mt-1 text-[11px] font-medium text-muted-foreground'>{t(action.descriptionKey)}</p>
                      </div>
                    </div>
                    <ArrowRight className='size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary' />
                  </button>
                  {installState ? (
                    <div className='ml-3 flex shrink-0 items-center'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='rounded-full px-3 text-[10px] font-black tracking-widest'
                        onClick={async (event) => {
                          event.stopPropagation()

                          if (installState.isPromptAvailable) {
                            await installState.promptInstall()
                            toast.success(t('quickActions.drawer.install.success'))
                            return
                          }

                          toast.message(t('quickActions.drawer.install.fallbackTitle'), {
                            description: `${installState.fallbackHint} ${t('quickActions.drawer.install.compatibilityHint')}`,
                          })
                        }}
                        disabled={!installState.canInstall}
                      >
                        <Download className='size-3.5' />
                        {resolveInstallLabel(installState.installLabel)}
                      </Button>
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>

        <div className='mt-auto border-t border-dashed border-border/70 p-4'>
          <Button variant='outline' className='h-10 w-full rounded-2xl text-[11px] font-black uppercase tracking-widest' onClick={() => onOpenChange(false)}>
            {t('quickActions.drawer.close')}
          </Button>
        </div>
        <input
          ref={photoInputRef}
          type='file'
          accept='image/*'
          capture='environment'
          className='hidden'
          onChange={(event) => void handleDirectCapture(event, 'photo')}
        />
        <input
          ref={videoInputRef}
          type='file'
          accept='video/*'
          capture='environment'
          className='hidden'
          onChange={(event) => void handleDirectCapture(event, 'video')}
        />
      </SheetContent>
    </Sheet>
  )
}
