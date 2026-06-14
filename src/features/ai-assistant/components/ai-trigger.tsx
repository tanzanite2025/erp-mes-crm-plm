import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, Mic } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAiPermissions } from '../hooks/use-ai-permissions'
import { useAiVoice } from '../hooks/use-ai-voice'
import { useDashboardSnapshot } from '../hooks/use-dashboard-snapshot'
import { aiAgentService } from '../services/ai-agent-service'
import { DailyInsightModal } from './daily-insight-modal'

interface AiTriggerProps {
  placement?: 'floating' | 'dock'
}

/**
 * AI 极光分析按钮 (V4.1 架构纯化版)
 * 职责：UI 交互触发器、语音入口、实时快照协调。
 * 特点：按钮永久显示 (Always Visible)，实时抓取快照 (Live Context)。
 */
export function AiTrigger({ placement = 'floating' }: AiTriggerProps) {
  const { canUseDashboardSnapshot } = useAiPermissions()
  const { getSnapshot } = useDashboardSnapshot()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [initialQuery, setInitialQuery] = useState<string>('')
  const [hasUnread, setHasUnread] = useState(false)
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleTrigger = useCallback((query: string = '') => {
    setInitialQuery(query)
    setIsModalOpen(true)
  }, [])

  // 语音识别集成
  const handleVoiceResult = useCallback(
    (transcript: string) => {
      setInitialQuery(transcript)
      handleTrigger(transcript)
    },
    [handleTrigger]
  )

  const { isRecording, startRecording, stopRecording } =
    useAiVoice(handleVoiceResult)

  // Agent 状态同步
  useEffect(() => {
    const updateStatus = () => {
      const state = aiAgentService.getState()
      setHasUnread(state.hasUnread)
      if (state.lastError) {
        toast.error(state.lastError)
        aiAgentService.clearLastError()
      }
    }
    aiAgentService.subscribe(updateStatus)
    updateStatus()

    if (!canUseDashboardSnapshot) return

    // 极光管家后台静默分析
    const checkTimer = setTimeout(() => {
      aiAgentService.checkAndRun()
    }, 5000)

    return () => clearTimeout(checkTimer)
  }, [canUseDashboardSnapshot])

  const startPress = (e: React.MouseEvent | React.TouchEvent) => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current)

    if (e.type === 'touchstart' && e.cancelable) e.preventDefault()

    pressTimerRef.current = setTimeout(() => {
      startRecording()
      if (navigator.vibrate) navigator.vibrate(50)
    }, 500)
  }

  const endPress = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.type === 'touchend' && e.cancelable) e.preventDefault()

    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
      if (!isRecording) {
        handleTrigger()
      } else {
        stopRecording()
      }
    } else if (isRecording) {
      stopRecording()
    }
  }

  const isDock = placement === 'dock'
  const triggerButton = (
    <div className={cn('relative', !isDock && 'scale-90 sm:scale-100')}>
      <Button
        size='icon'
        onMouseDown={startPress}
        onMouseUp={endPress}
        onTouchStart={startPress}
        onTouchEnd={endPress}
        className={cn(
          'rounded-full border-2 shadow-[0_0_40px_rgba(79,70,229,0.15)] transition-all duration-300',
          isDock ? 'size-11' : 'size-14',
          isRecording
            ? 'scale-110 animate-pulse border-rose-100/50 bg-rose-600 opacity-100'
            : 'border-indigo-500/20 bg-indigo-600 opacity-90 hover:scale-105 hover:opacity-100 active:scale-95 dark:border-indigo-400/20',
          isModalOpen && 'pointer-events-none scale-0 opacity-0'
        )}
      >
        <div className='relative flex items-center justify-center'>
          {isRecording ? (
            <Mic
              className={cn(
                'animate-bounce text-white',
                isDock ? 'size-5' : 'size-6'
              )}
            />
          ) : (
            <Sparkles
              className={cn('text-white', isDock ? 'size-5' : 'size-6')}
            />
          )}

          {hasUnread && !isRecording && (
            <span className='absolute -top-1 -right-1 block size-3.5 animate-pulse rounded-full border-2 border-white bg-rose-500 shadow-lg' />
          )}

          {!isRecording && !hasUnread && (
            <span className='absolute -top-1 -right-1 block size-2.5 animate-ping rounded-full bg-indigo-300' />
          )}
        </div>
      </Button>
    </div>
  )

  return (
    <>
      {isDock ? (
        triggerButton
      ) : (
        <div className='pointer-events-auto fixed bottom-6 left-6 z-[101]'>
          {triggerButton}
        </div>
      )}

      <DailyInsightModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        session={aiAgentService.getLastType()}
        content={aiAgentService.getLastInsight()}
        getLatestSnapshot={getSnapshot}
        initialQuery={initialQuery}
        hasUnread={hasUnread}
      />
    </>
  )
}
