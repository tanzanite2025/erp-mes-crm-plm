import { Button } from '@/components/ui/button'
import { Sparkles, Mic } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useDashboardSnapshot } from '../hooks/use-dashboard-snapshot'
import { cn } from '@/lib/utils'
import { aiAgentService } from '../services/ai-agent-service'
import { DailyInsightModal } from './daily-insight-modal'
import { useAiPermissions } from '../hooks/use-ai-permissions'
import { useAiVoice } from '../hooks/use-ai-voice'
import { toast } from 'sonner'

/**
 * AI 极光分析按钮 (V4.1 架构纯化版)
 * 职责：UI 交互触发器、语音入口、实时快照协调。
 * 特点：按钮永久显示 (Always Visible)，实时抓取快照 (Live Context)。
 */
export function AiTrigger() {
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
    const handleVoiceResult = useCallback((transcript: string) => {
        setInitialQuery(transcript)
        handleTrigger(transcript)
    }, [handleTrigger])
    
    const { isRecording, startRecording, stopRecording } = useAiVoice(handleVoiceResult)

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

    return (
        <>
            <div className="fixed bottom-6 left-6 z-[101] pointer-events-auto">
                <div className="scale-90 sm:scale-100 relative">
                    <Button
                        size="icon"
                        onMouseDown={startPress}
                        onMouseUp={endPress}
                        onTouchStart={startPress}
                        onTouchEnd={endPress}
                        className={cn(
                            "size-14 rounded-full shadow-[0_0_40px_rgba(79,70,229,0.2)] transition-all duration-300 border-2",
                            isRecording 
                                ? "bg-rose-600 border-rose-100 scale-110 animate-pulse opacity-100" 
                                : "bg-indigo-600 border-indigo-100 hover:scale-105 active:scale-95 opacity-80 hover:opacity-100",
                            isModalOpen && "scale-0 opacity-0 pointer-events-none"
                        )}
                    >
                        <div className="relative flex items-center justify-center">
                            {isRecording ? (
                                <Mic className="size-6 text-white animate-bounce" />
                            ) : (
                                <Sparkles className="size-6 text-white" />
                            )}
                            
                            {hasUnread && !isRecording && (
                                <span className="absolute -top-1 -right-1 block size-3.5 rounded-full bg-rose-500 border-2 border-white animate-pulse shadow-lg" />
                            )}
                            
                            {!isRecording && !hasUnread && (
                                <span className="absolute -top-1 -right-1 block size-2.5 rounded-full bg-indigo-300 animate-ping" />
                            )}
                        </div>
                    </Button>
                </div>
            </div>

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
