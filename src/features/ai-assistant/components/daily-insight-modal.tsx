import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Sparkles,
  Activity,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  Factory,
  ShoppingCart,
  Cpu,
  Send,
  Bot,
  Loader2,
  Eraser,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAiChatEngine } from '../hooks/use-ai-chat-engine'
import { aiActionBus } from '../services/ai-action-bus'
import {
  aiAgentService,
  type AgentSessionType,
} from '../services/ai-agent-service'
import { type DashboardSummary } from '../services/ai-service'
import { type ActionItem } from '../utils/tag-parser'
import { AiMessageItem } from './ai-message-item'

type AiRouteTarget = Parameters<ReturnType<typeof useNavigate>>[0]['to']

interface DailyInsightModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: AgentSessionType
  content: string
  getLatestSnapshot: () => Promise<DashboardSummary>
  canUsePageContext?: boolean
  initialQuery?: string
  hasUnread: boolean
}

/**
 * 极光经营简报弹窗 (V5.0 行动中心版)
 * 移除对话框，改为业务决策磁贴
 */
export function DailyInsightModal({
  open,
  onOpenChange,
  session,
  content,
  getLatestSnapshot,
  canUsePageContext = true,
  initialQuery,
  hasUnread,
}: DailyInsightModalProps) {
  const navigate = useNavigate()
  const isAM = session === 'AM_REVIEW'
  const [inputMessage, setInputMessage] = useState('')
  const {
    messages,
    isGenerating,
    isHistoryLoading,
    sendMessage,
    clearHistory,
  } = useAiChatEngine({ getLatestSnapshot, canUsePageContext })
  const isInsightMode = hasUnread && !!content.trim()
  const modalTitle = isInsightMode
    ? isAM
      ? '上午开局简报'
      : '下午进度预判'
    : 'Aurora 决策中枢'
  const modalDescription = isInsightMode
    ? 'AI 经营简报弹窗，展示当前经营分析与建议动作。'
    : 'AI 对话弹窗，可输入问询并查看流式分析结果。'
  const modalStatusLabel = isInsightMode
    ? '智能行动中心已就绪'
    : canUsePageContext
      ? '统一 AI 交互入口已就绪'
      : '当前页面未下发专属能力，已切换通用对话'

  useEffect(() => {
    if (
      open &&
      initialQuery?.trim() &&
      !isInsightMode &&
      messages.length === 0
    ) {
      void sendMessage(initialQuery)
    }
  }, [open, initialQuery, isInsightMode, messages.length, sendMessage])

  // 1. 解析指令解析器 [ACT: 文本 | 路径]
  const actions = useMemo(() => {
    const regex = /\[ACT:\s*([^|\]]+)\s*\|\s*([^\]]+)\]/g
    const matches: ActionItem[] = []
    let match
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        label: match[1].trim(),
        value: match[2].trim(),
        type: 'ACT',
      })
    }
    return matches
  }, [content])

  // 2. 清洗正文 (移除指令标签)
  const cleanContent = useMemo(() => {
    return content.replace(/\[ACT:[^\]]+\]/g, '').trim()
  }, [content])

  const handleAction = (path: string) => {
    onOpenChange(false)
    aiAgentService.markAsRead()
    navigate({ to: path as AiRouteTarget })
  }

  const handleExecuteAction = (action: ActionItem) => {
    const result = aiActionBus.dispatch(
      action,
      (to) => {
        onOpenChange(false)
        navigate({ to: to as AiRouteTarget })
      },
      (cmd) => {
        void sendMessage(
          `[CMD_AUTO] 执行分析指令: ${action.label}\nPayload: ${cmd}`
        )
      }
    )
    if (!result.ok && result.errorMessage) {
      toast.error(result.errorMessage)
    }
  }

  const handleSend = () => {
    if (!inputMessage.trim() || isGenerating) return
    void sendMessage(inputMessage)
    setInputMessage('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='z-1000 max-w-2xl animate-in overflow-hidden rounded-[32px] border-none p-0 shadow-[0_32px_128px_rgba(0,0,0,0.4)] duration-500 zoom-in-95 fade-in'>
        <DialogTitle className='sr-only'>{modalTitle}</DialogTitle>
        <DialogDescription className='sr-only'>
          {modalDescription}
        </DialogDescription>
        {/* 1. 头部装饰区域 */}
        <div
          className={cn(
            'relative overflow-hidden p-8 text-white',
            isAM
              ? 'bg-linear-to-br from-indigo-600 via-indigo-700 to-slate-900'
              : 'bg-linear-to-br from-indigo-700 via-slate-900 to-black'
          )}
        >
          <div className='pointer-events-none absolute top-0 right-0 p-8 opacity-10'>
            {isAM ? (
              <TrendingUp className='size-48 -rotate-12' />
            ) : (
              <Activity className='size-48 rotate-12' />
            )}
          </div>

          <div className='relative z-10 flex items-center gap-5'>
            <div className='flex size-14 items-center justify-center rounded-[20px] border border-white/30 bg-white/20 shadow-2xl backdrop-blur-2xl'>
              <Sparkles className='size-7 text-white' />
            </div>
            <div className='space-y-1'>
              <h2 className='text-xl leading-none font-black tracking-tighter uppercase italic md:text-2xl'>
                {modalTitle}
              </h2>
              <p className='flex items-center gap-2 text-[10px] font-black tracking-[0.3em] uppercase opacity-60'>
                <span className='size-1.5 animate-pulse rounded-full bg-emerald-400' />
                {modalStatusLabel}
              </p>
            </div>
            {!isInsightMode && (
              <div className='ml-auto flex items-center gap-2'>
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-9 rounded-full text-white hover:bg-white/10'
                  onClick={clearHistory}
                >
                  <Eraser className='size-4' />
                </Button>
              </div>
            )}
          </div>
        </div>

        {isInsightMode ? (
          <>
            {/* 2. 核心分析内容域 */}
            <div className='relative bg-card px-8 pt-8 pb-4'>
              <ScrollArea className='h-[300px] pr-6 md:h-[350px]'>
                <div className='prose prose-sm prose-slate max-w-none'>
                  <div className='text-[14px] leading-[1.8] font-bold tracking-tight whitespace-pre-wrap text-foreground/90'>
                    {cleanContent || '正在生成运营分析...'}
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* 3. 动态行动磁贴 (Action Tiles) */}
            {actions.length > 0 && (
              <div className='px-8 pb-4'>
                <div className='mb-3 flex items-center gap-2 text-[9px] font-black tracking-[0.2em] text-muted-foreground/60 uppercase'>
                  <div className='h-px flex-1 border-t border-dashed bg-border/40' />
                  建议直接处理以下业务动作
                  <div className='h-px flex-1 border-t border-dashed bg-border/40' />
                </div>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  {actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAction(action.value)}
                      className='group flex items-center justify-between rounded-2xl border border-dashed border-border/60 p-4 transition-all group-active:scale-95 hover:border-primary/40 hover:bg-primary/5'
                    >
                      <div className='flex items-center gap-3'>
                        <div className='flex size-9 items-center justify-center rounded-xl bg-muted/30 transition-colors group-hover:bg-card'>
                          {action.value.includes('trading') && (
                            <ShoppingCart className='size-4 text-muted-foreground/80' />
                          )}
                          {action.value.includes('production') && (
                            <Factory className='size-4 text-muted-foreground/80' />
                          )}
                          {action.value.includes('furnace') && (
                            <Cpu className='size-4 text-muted-foreground/80' />
                          )}
                          {!['trading', 'production', 'furnace'].some((k) =>
                            action.value.includes(k)
                          ) && (
                            <ExternalLink className='size-4 text-muted-foreground/80' />
                          )}
                        </div>
                        <div className='text-left'>
                          <div className='mb-1 text-[11px] leading-none font-black text-foreground/90'>
                            {action.label}
                          </div>
                          <div className='w-32 truncate font-mono text-[8px] tracking-tighter text-muted-foreground/40 uppercase'>
                            {action.value}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className='size-4 text-muted-foreground/30 transition-all group-hover:translate-x-1 group-hover:text-primary' />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. 底层操作按钮 */}
            <div className='flex items-center justify-center border-t border-dashed border-border/40 bg-muted/10 p-8 backdrop-blur-sm'>
              <Button
                onClick={() => {
                  onOpenChange(false)
                  aiAgentService.markAsRead()
                }}
                className='h-14 w-full max-w-sm gap-3 rounded-full bg-primary text-[11px] font-black tracking-[0.2em] text-primary-foreground uppercase shadow-2xl shadow-primary/10 transition-all hover:bg-primary/90 active:scale-95'
              >
                <CheckCircle2 className='size-5 text-emerald-400' />
                已知晓，继续监控全线运营
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className='relative bg-card px-8 pt-8 pb-4'>
              <ScrollArea className='h-[320px] pr-2 md:h-[360px]'>
                <div className='flex cursor-default flex-col gap-6 pb-4'>
                  {isHistoryLoading ? (
                    <div className='flex animate-pulse items-center justify-center py-20'>
                      <Loader2 className='size-6 animate-spin text-muted-foreground opacity-20' />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className='flex flex-col items-center justify-center gap-4 py-20 text-center'>
                      <Bot className='size-12 text-primary/10' />
                      <p className='text-[10px] font-black tracking-[0.3em] text-muted-foreground uppercase opacity-40'>
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
                    <div className='ml-2 flex animate-pulse items-center gap-2 text-[10px] font-black tracking-widest text-primary uppercase'>
                      <Activity className='size-4 animate-spin duration-1000' />
                      Stream Analysis...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className='flex flex-col gap-3 border-t border-dashed border-border/40 bg-muted/10 p-8 backdrop-blur-sm'>
              <Card className='flex items-center gap-1.5 rounded-[28px] border border-dashed border-primary/20 bg-muted/20 p-1.5 shadow-xl ring-primary/20 transition-all focus-within:ring-2'>
                <div className='flex-1 px-2.5'>
                  <Input
                    placeholder='请输入决策问询...'
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isGenerating}
                    className='h-10 border-none bg-transparent text-[13px] font-medium shadow-none placeholder:text-muted-foreground/30 focus-visible:ring-0'
                  />
                </div>
                <Button
                  size='icon'
                  disabled={!inputMessage.trim() || isGenerating}
                  onClick={handleSend}
                  className='size-10 rounded-full bg-primary shadow-lg shadow-primary/20 transition-transform active:scale-90'
                >
                  {isGenerating ? (
                    <Loader2 className='size-4 animate-spin' />
                  ) : (
                    <Send className='size-4' />
                  )}
                </Button>
              </Card>
              <div className='flex items-center justify-center gap-6 text-[8px] font-black tracking-widest text-muted-foreground/20 uppercase'>
                <div className='flex items-center gap-1.5'>
                  <Activity className='size-2.5 text-emerald-500/50' />
                  Performance Validated
                </div>
                <div className='flex items-center gap-1.5'>
                  <Bot className='size-2.5 text-indigo-500/50' />
                  Grounded Decision
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
