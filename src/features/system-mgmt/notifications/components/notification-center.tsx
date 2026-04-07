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
import { useNotificationStore } from '../notification-store'
import { type NotificationPriority, type SystemMessage } from '../types'
import { useAuthStore } from '@/stores/auth-store'
import { type StandardCommand } from '@/features/system-mgmt/workflow-core/data/schema'
import { type NotificationRule } from '@/features/system-mgmt/workflow-core/data/notification-rule-schema'
import { resolveTemplate } from '../notification-service'
import { useNavigate } from '@tanstack/react-router'
import { useRoles } from '@/features/system-mgmt/hooks/use-roles'
import { getSalesOrders } from '@/features/trading/sales'
import {
  getAuthSessionCompatibleRoleIds,
} from '@/features/authz/utils/auth-session'
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

/**
 * 全局系统消息中心 (Notification Center)
 * 已对齐“后端裁决”原则：移除组件挂载时的本地存储读取，改为实时同步后端指令与规则。
 */
export function NotificationCenter() {
  const user = useAuthStore((state) => state.user)
  const hasUser = !!user
  const { roles } = useRoles(hasUser)
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)
  const { messages, markAsRead, dismissMessage, removeMessage, clearAll } = useNotificationStore()
  const [stdCommands, setStdCommands] = useState<StandardCommand[]>([])
  const lastMessagesLength = useRef(messages.length)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 挂载时从后端获取指令全库，用于动态内容解析 (已移除 StorageService 依赖)
  useEffect(() => {
    if (!hasUser) return

    RoutingService.getCommands().then(cmds => {
      if (cmds) setStdCommands(cmds)
    }).catch(err => {
      logger.error('Failed to fetch sync commands', err)
    })
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

  // 处理角色过滤逻辑
  const userRoles = getAuthSessionCompatibleRoleIds(user)
  const userRoleLabels = roles
    .filter((role) => userRoles.includes(String(role.id)))
    .map((role) => String(role.label))

  const visibleMessages = messages.filter(msg => {
    if (msg.isArchived) return false
    if (!msg.targetRoles?.length && !msg.targetUsers?.length) return true
    
    const hasRole = (msg.targetRoles || []).some((role: string) =>
      userRoles.includes(role) || 
      userRoleLabels.includes(role)
    )
    const isTargetUser = (msg.targetUsers || []).includes(user?.username || '')
    return hasRole || isTargetUser
  })

  const visibleUnreadCount = visibleMessages.filter(m => !m.isRead).length
  const displayMessages = isExpanded
    ? visibleMessages
    : visibleMessages.filter(m => !m.isRead && !m.isDismissed).slice(0, 3)

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

  return (
    <div className="fixed bottom-6 right-6 z-100 flex flex-col items-end gap-3 pointer-events-none">
      <div className="flex flex-col-reverse gap-3 w-[340px] pointer-events-auto">
        {displayMessages.length > 0 ? displayMessages.map((msg, idx) => {
          const config = pConfig[msg.priority] || pConfig.info
          const Icon = config.icon
          const { title, content } = getDynamicContent(msg)

          return (
            <div
              key={msg.id}
              style={{ 
                zIndex: displayMessages.length - idx,
                transform: `scale(${1 - idx * 0.02}) translateX(${idx * 4}px)`,
                opacity: 1 - idx * 0.1
              }}
              className={cn(
                "relative group flex flex-col rounded-[24px] border border-white/40 bg-linear-to-br p-4 px-5 shadow-2xl backdrop-blur-2xl transition-all duration-500 hover:-translate-y-1 hover:scale-[1.02] animate-in slide-in-from-right-10 fade-in dark:border-white/10 dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
                config.gradient
              )}
            >
              <div className={cn("absolute -inset-px rounded-[24px] opacity-10 blur-sm pointer-events-none bg-linear-to-r", config.gradient.split(' ')[0])} />

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm", config.badge)}>
                    {msg.type.replace('_', ' ')}
                  </div>
                  {!msg.isRead && <div className="size-1.5 rounded-full bg-primary animate-pulse" />}
                </div>
                
                <button 
                  onClick={() => isExpanded ? removeMessage(msg.id) : dismissMessage(msg.id)}
                  className="flex size-5 items-center justify-center rounded-full text-slate-300 opacity-0 transition-all hover:bg-slate-100/50 hover:text-slate-600 group-hover:opacity-100 dark:text-slate-500 dark:hover:bg-white/6 dark:hover:text-slate-300"
                  title={isExpanded ? "删除这条消息" : "暂时关闭"}
                >
                  <X className="size-3" />
                </button>
              </div>

              <div className="space-y-1 relative">
                <h4 className="flex items-center gap-2 text-[14px] font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100">
                  <Icon className={cn("size-3.5", config.color)} />
                  {title}
                </h4>
                <p className="text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                  {content}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100/50 pt-3 dark:border-white/10">
                <div className="flex items-center gap-2">
                   <div className="flex size-5 items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-white/8">
                     <span className="text-[8px] font-bold capitalize text-slate-400 dark:text-slate-500">{msg.priority[0]}</span>
                   </div>
                   <span className="text-[9px] font-bold tracking-tighter text-slate-400 dark:text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {msg.actionUrl ? (
                    <Button 
                      variant="ghost" 
                      className="h-7 px-3 rounded-full text-[10px] font-black bg-primary text-white hover:bg-primary/90 hover:text-white shadow-lg shadow-primary/20 transition-all active:scale-95 group/btn gap-1"
                      onClick={() => {
                        markAsRead(msg.id)
                        navigate({ to: msg.actionUrl as never })
                      }}
                    >
                      立即处理 <ChevronRight className="size-3 transition-transform group-hover/btn:translate-x-0.5" />
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      className="h-7 rounded-full border border-slate-100 px-3 text-[10px] font-bold text-slate-400 transition-all hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/6 dark:text-slate-400"
                      onClick={() => markAsRead(msg.id)}
                      disabled={msg.isRead}
                    >
                      {msg.isRead ? '已阅' : '好的'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        }) : isExpanded && (
          <div className="animate-in space-y-2 rounded-[32px] border border-slate-100 bg-background/90 p-8 text-center shadow-xl backdrop-blur-xl fade-in zoom-in duration-300 dark:border-white/10 dark:bg-popover/90">
             <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-200 dark:bg-white/6 dark:text-slate-600">
                <Bell className="size-6" />
             </div>
             <div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">暂无待处理通知</p>
                <p className="text-[10px] text-slate-400 font-medium tracking-tight">您的工作台目前非常整洁</p>
             </div>
          </div>
        )}
      </div>

      <div className="pointer-events-auto mt-2 scale-90 sm:scale-100">
        <div className="flex flex-col items-end gap-2">
            {isExpanded && visibleMessages.length > 3 && (
              <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAll}
              className="rounded-full border border-slate-100 bg-background/90 px-4 text-[9px] font-black uppercase text-slate-400 shadow-sm backdrop-blur-md transition-all hover:text-destructive dark:border-white/10 dark:bg-popover/90 dark:text-slate-500"
              >
                清除全部通知
              </Button>
            )}
            <Button
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "size-14 rounded-full border-4 border-white/50 shadow-2xl ring-1 ring-black/5 transition-all duration-500 dark:border-white/10 dark:ring-white/10",
                visibleUnreadCount > 0 ? "bg-primary hover:bg-primary/90" : "bg-slate-900 hover:bg-slate-800"
              )}
            >
              <div className="relative">
                {isExpanded ? <X className="size-6" /> : <Bell className="size-6" />}
                {visibleUnreadCount > 0 && !isExpanded && (
                  <span className="absolute -top-4 -right-4 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white border-2 border-white px-1 shadow-lg animate-bounce">
                    {visibleUnreadCount > 99 ? '99+' : visibleUnreadCount}
                  </span>
                )}
              </div>
            </Button>
        </div>
      </div>
    </div>
  )
}
