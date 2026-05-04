import { useState, useEffect, useRef } from 'react'
import { 
  Bell, 
  X, 
  ChevronRight, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useNotificationStore } from '../notification-store'
import { type NotificationPriority, type SystemMessage } from '../types'
import { useAuthStore } from '@/stores/auth-store'
import { type StandardCommand } from '@/features/system-mgmt/workflow-core/data/schema'
import { type NotificationRule } from '@/features/system-mgmt/workflow-core/data/notification-rule-schema'
import { resolveTemplate } from '../notification-service'
import { useNavigate } from '@tanstack/react-router'
import { getSalesOrders } from '@/features/trading/sales'
import { createLogger } from '@/lib/logger'
import { RoutingService } from '@/features/system-mgmt/workflow-core/services/routing-service'

const NOTIFY_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'

const logger = createLogger('NotificationCenter')

type SalesOrderLike = { id: string }
type NotificationDynamicContent = { title: string; content: string }
type NotificationVisualConfig = {
  icon: typeof Info
  color: string
  badge: string
  gradient: string
}

interface NotificationCenterProps {
  placement?: 'header' | 'dock'
}

/**
 * 全局系统消息中心 (Notification Center)
 * 已对齐“后端裁决”原则：移除组件挂载时的本地存储读取，改为实时同步后端指令与规则。
 */
export function NotificationCenter({ placement = 'header' }: NotificationCenterProps) {
  const user = useAuthStore((state) => state.user)
  const hasUser = !!user
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)
  const { messages, markAsRead, dismissMessage, removeMessage, clearAll } = useNotificationStore()
  const [stdCommands, setStdCommands] = useState<StandardCommand[]>([])
  const lastMessagesLength = useRef(messages.length)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 挂载时从后端获取指令全库，用于动态内容解析 (已移除 StorageService 依赖)
  useEffect(() => {
    if (!hasUser) return

    let isActive = true

    const loadCommands = async () => {
      try {
        const cmds = await RoutingService.getCommands()
        if (isActive && cmds) {
          setStdCommands(cmds)
        }
      } catch (err) {
        logger.error('Failed to fetch sync commands', err)
      }
    }

    void loadCommands()

    return () => {
      isActive = false
    }
  }, [hasUser])

  // 初始化音效与数据完整性同步
  useEffect(() => {
    audioRef.current = new Audio(NOTIFY_SOUND_URL)
    audioRef.current.volume = 0.5

        const checkIntegrity = async () => {
            try {
                // ─── 核心变更：对接后端事实源 ───
                const [response, rules, commands] = await Promise.all([
                    hasUser ? getSalesOrders().catch(() => null) : Promise.resolve(null),
                    hasUser
                      ? RoutingService.getRules().catch(() => [] as NotificationRule[])
                      : Promise.resolve([] as NotificationRule[]),
                    hasUser
                      ? RoutingService.getCommands().catch(() => [] as StandardCommand[])
                      : Promise.resolve([] as StandardCommand[])
                ])
                
                const store = useNotificationStore.getState()
                
                // 1. 同步单据存亡 (云端化)
                if (response && response.items) {
                    store.syncWithOrders(response.items.map((order: SalesOrderLike) => order.id))
                }
                // 2. 同步指令与规则至 Store (确保消息渲染的准确性)
                if (commands) {
                    store.syncWithCommands(commands.map((command) => command.id))
                    // 如果挂载时的异步还没回来，这里做个补偿
                    if (stdCommands.length === 0) setStdCommands(commands)
                }
                if (rules) {
                    const activeRuleIds = rules.filter((rule) => rule.enabled).map((rule) => rule.id)
                    store.syncWithRules(activeRuleIds)
                }

                store.pruneOldMessages(30)
            } catch (err) {
                logger.warn('Failed to sync with backend', err)
            }
        }
        checkIntegrity()
    }, [hasUser, stdCommands.length])

  useEffect(() => {
    if (messages.length > lastMessagesLength.current) {
        audioRef.current?.play().catch(() => {})
    }
    lastMessagesLength.current = messages.length
  }, [messages.length])

  const visibleMessages = messages.filter(msg => {
    if (msg.isArchived) return false
    if (!msg.targetGroups?.length && !msg.targetUsers?.length) return true

    const isTargetUser = (msg.targetUsers || []).includes(user?.username || '')
    return isTargetUser
  })

  const visibleUnreadCount = visibleMessages.filter(m => !m.isRead).length

  const getDynamicContent = (msg: SystemMessage): NotificationDynamicContent => {
    if (!msg.commandId) return { title: msg.title, content: msg.content }
    const cmd = stdCommands.find(c => c.id === msg.commandId)
    if (!cmd) return { title: msg.title, content: msg.content }
    return {
      title: resolveTemplate(cmd.title || msg.title, msg.metadata),
      content: resolveTemplate(cmd.content || msg.content, msg.metadata)
    }
  }

  const pConfig: Record<NotificationPriority, NotificationVisualConfig> = {
    info: { icon: Info, color: 'text-blue-500', badge: 'bg-blue-100/50 text-blue-600', gradient: 'from-blue-50/50 to-white' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', badge: 'bg-amber-100/50 text-amber-600', gradient: 'from-amber-50/50 to-white' },
    error: { icon: AlertCircle, color: 'text-red-500', badge: 'bg-red-100/50 text-red-600', gradient: 'from-red-50/50 to-white' },
    critical: { icon: ShieldAlert, color: 'text-rose-600', badge: 'bg-rose-100/50 text-rose-600', gradient: 'from-rose-50/50 to-white' },
  }
  const isDock = placement === 'dock'

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "relative rounded-full border border-dashed border-cyan-500/20 bg-cyan-500 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_14px_32px_-16px_rgba(6,182,212,0.85)] transition-all hover:border-white/90 hover:bg-cyan-400 hover:text-white hover:shadow-[0_0_0_1px_rgba(103,232,249,0.3),0_16px_34px_-16px_rgba(34,211,238,0.9)] dark:border-cyan-400/20 dark:bg-cyan-500/90 dark:text-slate-950 dark:shadow-[0_0_0_1px_rgba(165,243,252,0.15),0_16px_34px_-16px_rgba(34,211,238,0.7)] dark:hover:border-cyan-300/40 dark:hover:bg-cyan-400 dark:hover:text-slate-950",
          isDock ? "size-11 hover:scale-105 active:scale-95" : "h-10 w-10",
          isExpanded && "border-white bg-cyan-300 text-slate-950 shadow-[0_0_0_1px_rgba(165,243,252,0.45),0_18px_36px_-16px_rgba(34,211,238,1)] dark:border-white dark:bg-cyan-200 dark:text-slate-950",
          visibleUnreadCount > 0 && !isExpanded && "ring-2 ring-cyan-400/30 ring-offset-2 ring-offset-background dark:ring-cyan-300/20"
        )}
      >
        {isExpanded ? (
          <X className="size-[1.1rem] drop-shadow-[0_1px_4px_rgba(8,47,73,0.35)]" />
        ) : (
          <Bell className="size-[1.1rem] drop-shadow-[0_1px_4px_rgba(8,47,73,0.35)]" />
        )}
        {visibleUnreadCount > 0 && !isExpanded ? (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-background/80 bg-red-500 px-1 text-[9px] font-black text-white shadow-lg dark:border-background/60">
            {visibleUnreadCount > 99 ? '99+' : visibleUnreadCount}
          </span>
        ) : null}
      </Button>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="w-[95vw] max-w-[860px] rounded-[32px] border-none p-0 shadow-2xl">
          <div className="relative overflow-hidden rounded-[32px] bg-background">
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent" />
            <div className="relative flex flex-col gap-0">
              <DialogHeader className="border-b border-dashed border-border/60 px-6 py-5 text-left">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <DialogTitle className="text-lg font-black italic uppercase tracking-tighter">
                      通知中心
                    </DialogTitle>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                      统一查看全部系统通知与待处理消息
                    </p>
                  </div>
                  <div className="rounded-full border border-dashed border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                    未读 {visibleUnreadCount}
                  </div>
                </div>
              </DialogHeader>

              <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
                {visibleMessages.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {visibleMessages.map((msg) => {
                      const config = pConfig[msg.priority] || pConfig.info
                      const Icon = config.icon
                      const { title, content } = getDynamicContent(msg)

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "relative rounded-[24px] border border-dashed p-4 shadow-sm transition-colors",
                            msg.isRead
                              ? "border-border/60 bg-background"
                              : "border-primary/20 bg-primary/5",
                            "bg-linear-to-br",
                            config.gradient
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-3 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm", config.badge)}>
                                  {msg.type.replace('_', ' ')}
                                </div>
                                {!msg.isRead ? (
                                  <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                                ) : null}
                                <span className="text-[9px] font-bold tracking-widest text-muted-foreground/60">
                                  {new Date(msg.timestamp).toLocaleString()}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <h4 className="flex items-center gap-2 text-sm font-black tracking-tight text-foreground">
                                  <Icon className={cn("size-4 shrink-0", config.color)} />
                                  <span className="min-w-0 truncate">{title}</span>
                                </h4>
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                  {content}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => removeMessage(msg.id)}
                              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
                              title="删除这条消息"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border/50 pt-3">
                            <div className="flex items-center gap-2">
                              <div className="flex size-5 items-center justify-center overflow-hidden rounded-full bg-muted">
                                <span className="text-[8px] font-bold capitalize text-muted-foreground">
                                  {msg.priority[0]}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold tracking-widest text-muted-foreground/60">
                                {msg.priority}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {msg.isDismissed ? null : (
                                <Button
                                  variant="ghost"
                                  className="h-8 rounded-full border border-dashed border-border/60 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
                                  onClick={() => dismissMessage(msg.id)}
                                >
                                  暂时关闭
                                </Button>
                              )}
                              {msg.actionUrl ? (
                                <Button
                                  variant="ghost"
                                  className="h-8 rounded-full bg-primary px-3 text-[10px] font-black uppercase tracking-widest text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                  onClick={() => {
                                    markAsRead(msg.id)
                                    setIsExpanded(false)
                                    navigate({ to: msg.actionUrl as never })
                                  }}
                                >
                                  立即处理
                                  <ChevronRight className="ml-1 size-3" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  className="h-8 rounded-full border border-dashed border-border/60 px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
                                  onClick={() => markAsRead(msg.id)}
                                  disabled={msg.isRead}
                                >
                                  {msg.isRead ? '已阅' : '标记已阅'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-[28px] border border-dashed border-border/60 bg-muted/10 px-6 py-14 text-center">
                    <div className="flex size-14 items-center justify-center rounded-[20px] bg-muted text-muted-foreground/50">
                      <Bell className="size-7" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black italic uppercase tracking-tighter text-foreground">
                        暂无待处理通知
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                        您的工作台目前非常整洁
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="border-t border-dashed border-border/60 px-6 py-4">
                <div className="flex w-full items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    onClick={clearAll}
                    disabled={visibleMessages.length === 0}
                    className="h-9 rounded-full border border-dashed border-border/60 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive"
                  >
                    清除全部通知
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsExpanded(false)}
                    className="h-9 rounded-full px-6 text-[10px] font-black uppercase tracking-widest"
                  >
                    关闭
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
