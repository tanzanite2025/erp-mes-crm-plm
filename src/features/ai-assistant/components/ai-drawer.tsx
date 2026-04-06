import { useEffect, useRef, useState } from 'react'
import { 
  X, 
  Send, 
  Eraser, 
  Bot, 
  Loader2, 
  Zap,
  Activity,
  Maximize2,
  Minimize2,
  Sparkles
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useAiContextStore } from '@/stores/ai-context-store'
import { type DashboardSummary } from '../services/ai-service'
import { useAiChatEngine } from '../hooks/use-ai-chat-engine'
import { AiMessageItem } from './ai-message-item'
import { aiActionBus } from '../services/ai-action-bus'

interface AiDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  getLatestSnapshot: () => Promise<DashboardSummary>
  initialQuery?: string
}

/**
 * AI 极光分析面板 (V4.6 逻辑闭环加固版)
 * 职责：UI 呈现、移动端键盘适配、列表渲染性能隔离。
 * 变更：接入全局 Action Bus，统一指令分发逻辑。
 */
export function AiDrawer({ open, onOpenChange, getLatestSnapshot, initialQuery }: AiDrawerProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  
  // 1. 挂载 AI 聊天引擎
  const { 
    messages, 
    isGenerating, 
    isHistoryLoading, 
    sendMessage, 
    clearHistory 
  } = useAiChatEngine({ getLatestSnapshot })

  // 2. 临场感状态 (UI 装饰用)
  const contextTitle = useAiContextStore(s => s.contextTitle)

  // 3. 移动端键盘适配 (VisualViewport)
  const [viewportHeight, setViewportHeight] = useState('100%')
  useEffect(() => {
    if (!window.visualViewport) return
    const handleResize = () => {
      setViewportHeight(`${window.visualViewport?.height}px`)
    }
    window.visualViewport.addEventListener('resize', handleResize)
    return () => window.visualViewport?.removeEventListener('resize', handleResize)
  }, [])

  // 4. 自动滚动逻辑
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: isGenerating ? 'auto' : 'smooth',
        })
      }
    }
  }, [messages, isGenerating])

  // 5. 初始化触发
  useEffect(() => {
    if (open && initialQuery && messages.length === 0) {
      sendMessage(initialQuery)
    }
  }, [open, initialQuery, messages.length, sendMessage])

  const handleSend = () => {
    if (!inputMessage.trim() || isGenerating) return
    sendMessage(inputMessage)
    setInputMessage('')
  }

  // [闭环逻辑]: 统一通过 Action Bus 分发
  const handleExecuteAction = (action: any) => {
    aiActionBus.dispatch(
      action, 
      (to) => {
        onOpenChange(false)
        navigate({ to: to as any })
      },
      (cmd) => {
        sendMessage(`[CMD_AUTO] 执行分析指令: ${action.label}\nPayload: ${cmd}`)
      }
    )
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-[200] bg-black"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            style={{ height: viewportHeight }}
            className={cn(
              "fixed right-0 top-0 z-[201] bg-background/95 backdrop-blur-xl border-l border-dashed border-primary/20 shadow-2xl flex flex-col transition-all duration-200",
              isMaximized ? "w-full" : "w-full sm:w-[540px] xl:w-[600px]"
            )}
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-dashed border-primary/10 flex items-center justify-between bg-primary/[0.02]">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Sparkles className="size-5 sm:size-6 text-primary animate-pulse" />
                    <Zap className="absolute -top-1 -right-1 size-3 text-emerald-500 fill-emerald-500" />
                  </div>
                  <h2 className="text-[12px] sm:text-sm font-black italic uppercase tracking-tighter text-primary">
                    Aurora.D2 <span className="opacity-40 ml-1">v4.6</span>
                  </h2>
                </div>
                {contextTitle && (
                  <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 transition-all">
                    <span className="relative flex h-1.5 w-1.5">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600/80 truncate max-w-[150px] sm:max-w-none">
                      {contextTitle}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="ghost" size="icon" className="size-8 rounded-full hover:bg-primary/10" onClick={clearHistory}>
                  <Eraser className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8 rounded-full hidden sm:flex hover:bg-primary/10" onClick={() => setIsMaximized(!isMaximized)}>
                  {isMaximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="size-8 rounded-full hover:bg-primary/10" onClick={() => onOpenChange(false)}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Chat Area */}
            <ScrollArea className="flex-1 px-4 sm:px-6 py-4" ref={scrollRef}>
              <div className="flex flex-col gap-6 pb-20 cursor-default">
                {isHistoryLoading ? (
                  <div className="flex items-center justify-center py-20 animate-pulse">
                    <Loader2 className="size-6 animate-spin text-muted-foreground opacity-20" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                    <Bot className="size-12 text-primary/10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40">
                      Aurora 决策引擎就绪
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <AiMessageItem 
                      key={idx} 
                      msg={msg} 
                      onExecuteAction={handleExecuteAction}
                    />
                  ))
                )}
                {isGenerating && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary animate-pulse ml-2"
                  >
                     <Activity className="size-4 animate-spin duration-1000" />
                     Stream Analysis...
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="px-4 sm:px-6 py-6 mt-auto bg-gradient-to-t from-background via-background to-transparent sticky bottom-0">
              <Card className="p-1.5 flex items-center gap-1.5 rounded-[28px] border border-dashed border-primary/20 bg-muted/20 focus-within:ring-2 ring-primary/20 transition-all shadow-xl">
                <div className="flex-1 px-2.5">
                  <Input
                    placeholder="请输入决策问询..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isGenerating}
                    className="h-10 border-none bg-transparent focus-visible:ring-0 text-[13px] font-medium placeholder:text-muted-foreground/30 shadow-none"
                  />
                </div>
                <Button
                  size="icon"
                  disabled={!inputMessage.trim() || isGenerating}
                  onClick={handleSend}
                  className="size-10 rounded-full bg-primary shadow-lg shadow-primary/20 transition-transform active:scale-90"
                >
                  {isGenerating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </Card>
              <div className="mt-3 flex items-center justify-center gap-6 text-[8px] font-black uppercase tracking-widest text-muted-foreground/20">
                <div className="flex items-center gap-1.5">
                  <Activity className="size-2.5 text-emerald-500/50" />
                  Performance Validated
                </div>
                <div className="flex items-center gap-1.5">
                  <Bot className="size-2.5 text-indigo-500/50" />
                  Grounded Decision
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
