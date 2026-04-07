import { 
    Dialog, 
    DialogContent, 
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, Activity, CheckCircle2, TrendingUp, ArrowRight, ExternalLink, Factory, ShoppingCart, Cpu, Send, Bot, Loader2, Eraser } from 'lucide-react'
import { aiAgentService, type AgentSessionType } from '../services/ai-agent-service'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAiChatEngine } from '../hooks/use-ai-chat-engine'
import { AiMessageItem } from './ai-message-item'
import { aiActionBus } from '../services/ai-action-bus'
import { type DashboardSummary } from '../services/ai-service'
import { type ActionItem } from '../utils/tag-parser'

type AiRouteTarget = Parameters<ReturnType<typeof useNavigate>>[0]['to']

interface DailyInsightModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: AgentSessionType;
    content: string;
    getLatestSnapshot: () => Promise<DashboardSummary>;
    initialQuery?: string;
    hasUnread: boolean;
}

/**
 * 极光经营简报弹窗 (V5.0 行动中心版)
 * 移除对话框，改为业务决策磁贴
 */
export function DailyInsightModal({ open, onOpenChange, session, content, getLatestSnapshot, initialQuery, hasUnread }: DailyInsightModalProps) {
    const navigate = useNavigate()
    const isAM = session === 'AM_REVIEW'
    const [inputMessage, setInputMessage] = useState('')
    const {
        messages,
        isGenerating,
        isHistoryLoading,
        sendMessage,
        clearHistory,
    } = useAiChatEngine({ getLatestSnapshot })
    const isInsightMode = hasUnread && !!content.trim()

    useEffect(() => {
        if (open && initialQuery?.trim() && !isInsightMode && messages.length === 0) {
            void sendMessage(initialQuery)
        }
    }, [open, initialQuery, isInsightMode, messages.length, sendMessage])

    // 1. 解析指令解析器 [ACT: 文本 | 路径]
    const actions = useMemo(() => {
        const regex = /\[ACT:\s*([^|\]]+)\s*\|\s*([^\]]+)\]/g;
        const matches: ActionItem[] = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push({
                label: match[1].trim(),
                value: match[2].trim(),
                type: 'ACT'
            });
        }
        return matches;
    }, [content]);

    // 2. 清洗正文 (移除指令标签)
    const cleanContent = useMemo(() => {
        return content.replace(/\[ACT:[^\]]+\]/g, '').trim();
    }, [content]);

    const handleAction = (path: string) => {
        onOpenChange(false);
        aiAgentService.markAsRead();
        navigate({ to: path as AiRouteTarget });
    };

    const handleExecuteAction = (action: ActionItem) => {
        aiActionBus.dispatch(
            action,
            (to) => {
                onOpenChange(false)
                navigate({ to: to as AiRouteTarget })
            },
            (cmd) => {
                void sendMessage(`[CMD_AUTO] 执行分析指令: ${action.label}\nPayload: ${cmd}`)
            }
        )
    }

    const handleSend = () => {
        if (!inputMessage.trim() || isGenerating) return
        void sendMessage(inputMessage)
        setInputMessage('')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-[32px] border-none shadow-[0_32px_128px_rgba(0,0,0,0.4)] p-0 overflow-hidden z-[1000] animate-in fade-in zoom-in-95 duration-500">
                <DialogTitle className="sr-only">
                    {isInsightMode ? (isAM ? '上午开局简报' : '下午进度预判') : 'Aurora 决策中枢'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    {isInsightMode
                        ? 'AI 经营简报弹窗，展示当前经营分析与建议动作。'
                        : 'AI 对话弹窗，可输入问询并查看流式分析结果。'}
                </DialogDescription>
                {/* 1. 头部装饰区域 */}
                <div className={cn(
                    "p-8 text-white relative overflow-hidden",
                    isAM ? "bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900" 
                         : "bg-gradient-to-br from-indigo-700 via-slate-900 to-black"
                )}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        {isAM ? <TrendingUp className="size-48 -rotate-12" /> : <Activity className="size-48 rotate-12" />}
                    </div>

                    <div className="flex items-center gap-5 relative z-10">
                        <div className="size-14 rounded-[20px] bg-white/20 backdrop-blur-2xl flex items-center justify-center border border-white/30 shadow-2xl">
                            <Sparkles className="size-7 text-white" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase leading-none">
                                {isInsightMode ? (isAM ? '上午开局简报' : '下午进度预判') : 'Aurora 决策中枢'}
                            </h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                {isInsightMode ? '智能行动中心已就绪' : '统一 AI 交互入口已就绪'}
                            </p>
                        </div>
                        {!isInsightMode && (
                            <div className="ml-auto flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="size-9 rounded-full text-white hover:bg-white/10" onClick={clearHistory}>
                                    <Eraser className="size-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {isInsightMode ? (
                    <>
                        {/* 2. 核心分析内容域 */}
                        <div className="px-8 pt-8 pb-4 bg-white relative">
                            <ScrollArea className="h-[300px] md:h-[350px] pr-6">
                                <div className="prose prose-sm max-w-none prose-slate">
                                    <div className="whitespace-pre-wrap font-bold text-[14px] text-slate-800 leading-[1.8] tracking-tight">
                                        {cleanContent || '正在生成运营分析...'}
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>

                        {/* 3. 动态行动磁贴 (Action Tiles) */}
                        {actions.length > 0 && (
                            <div className="px-8 pb-4">
                                <div className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                    <div className="h-px flex-1 bg-slate-100 border-dashed border-t" />
                                    建议直接处理以下业务动作
                                    <div className="h-px flex-1 bg-slate-100 border-dashed border-t" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {actions.map((action, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAction(action.value)}
                                            className="flex items-center justify-between p-4 rounded-2xl border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group group-active:scale-95"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="size-9 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                                                    {action.value.includes('trading') && <ShoppingCart className="size-4 text-slate-600" />}
                                                    {action.value.includes('production') && <Factory className="size-4 text-slate-600" />}
                                                    {action.value.includes('furnace') && <Cpu className="size-4 text-slate-600" />}
                                                    {!['trading', 'production', 'furnace'].some(k => action.value.includes(k)) && <ExternalLink className="size-4 text-slate-600" />}
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-[11px] font-black text-slate-900 leading-none mb-1">{action.label}</div>
                                                    <div className="text-[8px] font-mono text-slate-400 uppercase tracking-tighter truncate w-32">
                                                        {action.value}
                                                    </div>
                                                </div>
                                            </div>
                                            <ArrowRight className="size-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 4. 底层操作按钮 */}
                        <div className="p-8 bg-slate-50/80 backdrop-blur-sm flex items-center justify-center border-t border-dashed border-slate-200/50">
                            <Button 
                                onClick={() => {
                                    onOpenChange(false);
                                    aiAgentService.markAsRead();
                                }}
                                className="w-full max-w-sm h-14 rounded-full bg-slate-900 hover:bg-black text-[11px] font-black uppercase tracking-[0.2em] gap-3 shadow-2xl shadow-indigo-100 active:scale-95 transition-all"
                            >
                                <CheckCircle2 className="size-5 text-emerald-400" />
                                已知晓，继续监控全线运营
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="px-8 pt-8 pb-4 bg-white relative">
                            <ScrollArea className="h-[320px] md:h-[360px] pr-2">
                                <div className="flex flex-col gap-6 pb-4 cursor-default">
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
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary animate-pulse ml-2">
                                            <Activity className="size-4 animate-spin duration-1000" />
                                            Stream Analysis...
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="p-8 bg-slate-50/80 backdrop-blur-sm flex flex-col gap-3 border-t border-dashed border-slate-200/50">
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
                            <div className="flex items-center justify-center gap-6 text-[8px] font-black uppercase tracking-widest text-muted-foreground/20">
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
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
