import { 
  SystemMessage,
  NotificationState 
} from './types'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// metadata 是 Record<string, unknown>,但业务上常用以下几个动态字段。
// 集中读取入口避免散落 `as any`,保留运行时安全(undefined 时返回空字符串)。
function readMetaString(meta: SystemMessage['metadata'], ...keys: string[]): string {
  if (!meta) return ''
  for (const key of keys) {
    const value = meta[key]
    if (typeof value === 'string' && value) return value
  }
  return ''
}
function readMetaUniqueKey(meta: SystemMessage['metadata']): string {
  return readMetaString(meta, 'uniqueKey')
}
function readMetaCommandId(meta: SystemMessage['metadata']): string {
  return readMetaString(meta, 'commandId')
}
function readMetaOrderId(meta: SystemMessage['metadata']): string {
  return readMetaString(meta, 'orderId', 'OrderId', 'id')
}

/**
 * 全局消息通知状态管理中心 (简版 - 仅管理消息记录)
 * 路由分发逻辑已收拢至 Workflow Designer 驱动
 */
export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      messages: [],
      unreadCount: 0,
      dismissedKeys: {}, // 记录 [uniqueKey]: timestamp
      
      // 添加/更新消息 (内置去重逻辑)
      addMessage: (data) => {
        const now = new Date().toISOString()
        const uniqueKey = readMetaUniqueKey(data.metadata)

        set((state) => {
          // 1. 查找是否存在相同 uniqueKey 且未归档的消息
          const existingIndex = uniqueKey 
            ? state.messages.findIndex(m => readMetaUniqueKey(m.metadata) === uniqueKey && !m.isArchived)
            : -1

          if (existingIndex > -1) {
            // 2. 存在则更新该条记录 (覆盖内容与时间，重置弹出状态)
            const updatedMessages = [...state.messages]
            const oldMessage = updatedMessages[existingIndex]
            
            updatedMessages[existingIndex] = {
              ...oldMessage,
              ...data,
              timestamp: now,
              isDismissed: false, // 再次弹出提醒
            }

            return {
              messages: updatedMessages,
              // 如果原来是已读的，现在变回未读（可选，按需决定是否需要通过更新来“标未读”）
              // 这里的策略是：保持原有的 read 状态，仅重置 popup
              unreadCount: state.unreadCount
            }
          }

          // 3. 不存在则新增
          const newMessage: SystemMessage = {
            ...data,
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
            timestamp: now,
            isRead: false,
            isDismissed: false,
          }
          
          return {
            messages: [newMessage, ...state.messages],
            unreadCount: state.unreadCount + 1,
          }
        })
      },

      // 标记已读 (视为暂时处理，进入静默期)
      markAsRead: (id) => {
        set((state) => {
          const message = state.messages.find((m) => m.id === id)
          if (!message || message.isRead) return state

          const uniqueKey = readMetaUniqueKey(message.metadata)
          const newDismissed = { ...state.dismissedKeys }
          if (uniqueKey) {
            newDismissed[uniqueKey] = Date.now()
          }

          return {
            messages: state.messages.map((m) =>
              m.id === id ? { ...m, isRead: true, isDismissed: true } : m
            ),
            unreadCount: state.unreadCount - 1,
            dismissedKeys: newDismissed
          }
        })
      },

      // 仅关闭弹窗 (不删除消息，仅从屏幕隐藏并进入 Snooze)
      dismissMessage: (id: string) => {
        set((state) => {
          const message = state.messages.find((m) => m.id === id)
          if (!message) return state

          const uniqueKey = readMetaUniqueKey(message.metadata)
          const newDismissed = { ...state.dismissedKeys }
          if (uniqueKey) {
            newDismissed[uniqueKey] = Date.now()
          }

          return {
            messages: state.messages.map((m) =>
              m.id === id ? { ...m, isDismissed: true } : m
            ),
            dismissedKeys: newDismissed
          }
        })
      },

      // 彻底移除消息 (物理删除)
      removeMessage: (id: string) => {
        set((state) => {
          const message = state.messages.find((m) => m.id === id)
          const newMessages = state.messages.filter((m) => m.id !== id)
          const unreadAdjustment = message && !message.isRead ? 1 : 0
          
          return {
            messages: newMessages,
            unreadCount: state.unreadCount - unreadAdjustment,
          }
        })
      },

      // 归档消息：订单状态已解除触发条件，消息自动归档（区别于用户手动关闭）
      // isArchived=true 的消息不再参与轮询去重，也不显示在 Toast
      archiveMessage: (id: string) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, isRead: true, isDismissed: true, isArchived: true } : m
          ),
          unreadCount: Math.max(0, state.unreadCount - (state.messages.find(m => m.id === id && !m.isRead) ? 1 : 0)),
        }))
      },

      // 批量归档：根据元数据中的 OrderId 归档所有相关未读消息
      archiveByOrderId: (orderId: string) => {
        set((state) => {
          const toArchive = state.messages.filter(
            m => {
               if (!m.metadata) {
                 // 如果消息没有元数据但是进入了按订单归档逻辑，说明数据结构损坏或逻辑错误
                 throw new Error(`[CRITICAL] Notification message ${m.id} missing metadata during archiveByOrderId`);
               }
               const matchesId = readMetaOrderId(m.metadata) === orderId
               return matchesId && !m.isRead && !m.isArchived
            }
          )
          if (toArchive.length === 0) return state
          return {
            messages: state.messages.map(m =>
              toArchive.some(a => a.id === m.id)
                ? { ...m, isRead: true, isDismissed: true, isArchived: true }
                : m
            ),
            unreadCount: Math.max(0, state.unreadCount - toArchive.length),
          }
        })
      },

      // 彻底清理：根据有效规则 ID 列表同步消息。清理那些指向已停用/删除业务规则的消息。
      syncWithRules: (validRuleIds: string[]) => {
        set((state) => {
          const validIdsSet = new Set(validRuleIds)
          const newMessages = state.messages.filter(m => {
            // 如果某条消息绑定了特定规则，但该规则已失效，则该消息失效并自动清理
            if (m.ruleId && !validIdsSet.has(m.ruleId)) return false
            return true
          })
          
          if (newMessages.length === state.messages.length) return state
          
          return {
            messages: newMessages,
            unreadCount: newMessages.filter(m => !m.isRead).length
          }
        })
      },

      // 彻底清理：根据有效指令 ID 列表同步消息。清理那些指向已不存在/删除指令的“孤立消息”。
      syncWithCommands: (validCommandIds: string[]) => {
        set((state) => {
          const validIdsSet = new Set(validCommandIds)
          const newMessages = state.messages.filter(m => {
            const cmdId = readMetaCommandId(m.metadata)
            // 如果某条消息绑定了特定指令，但该指令已从配置中移除，则该消息失效并自动清理
            if (cmdId && !validIdsSet.has(cmdId)) return false
            return true
          })
          
          if (newMessages.length === state.messages.length) return state
          
          return {
            messages: newMessages,
            unreadCount: newMessages.filter(m => !m.isRead).length
          }
        })
      },
      
      // 彻底清理：根据有效订单 ID 列表同步消息。清理那些指向已不存在/删除订单的指令。
      syncWithOrders: (validOrderIds: string[]) => {
        set((state) => {
          const validIdsSet = new Set(validOrderIds)
          const newMessages = state.messages.filter(m => {
            if (!m.metadata) return true // 允许没有元数据的消息保留，但不参与订单同步逻辑
            const orderId = readMetaOrderId(m.metadata)
            // 如果某条消息绑定了特定订单，但该订单已从系统中彻底删除，则该消息失效
            if (orderId && !validIdsSet.has(orderId)) return false
            return true
          })
          
          if (newMessages.length === state.messages.length) return state
          
          return {
            messages: newMessages,
            unreadCount: newMessages.filter(m => !m.isRead).length
          }
        })
      },

      // 滚动清理：移除过期消息
      pruneOldMessages: (days: number) => {
        const threshold = Date.now() - (days * 24 * 60 * 60 * 1000)
        set((state) => {
          const newMessages = state.messages.filter(m => {
            const isOld = new Date(m.timestamp).getTime() < threshold
            // 仅清理那些已经不再需要处理的消息
            if (isOld && (m.isRead || m.isArchived)) return false
            return true
          })
          if (newMessages.length === state.messages.length) return state
          return {
            messages: newMessages,
            unreadCount: newMessages.filter(m => !m.isRead).length
          }
        })
      },

      // 清空消息 (用于注销/多用户切换)
      clearAll: () => {
        set({
          messages: [],
          unreadCount: 0,
          dismissedKeys: {}
        })
      },

      // --- 以下为兼容旧版逻辑的空实现 (防崩溃) ---
      rules: [],
      updateRule: () => {},
      initializeRules: () => {},
      cleanupGroups: () => {},
    }),
    {
      name: 'xdfc_notifications_v3', // 协议升级，重置存储
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 消息纠偏与计数回正 (500 防崩溃与计数同步)
          const validMessages = (state.messages || []).map(m => {
            if (m.actionUrl && (m.actionUrl.includes('ordersv2') || (m.actionUrl.includes('sales-orders') && !m.actionUrl.includes('detailId')))) {
              const orderId = m.actionUrl.match(/SO\d{14}/)?.[0] || ''
              if (m.actionUrl.includes('ordersv2')) {
                return { 
                   ...m, 
                   actionUrl: m.actionUrl.replace('ordersv2/', 'sales-orders?search=').replace(orderId, '') + `&detailId=${orderId}`
                }
              }
              return { ...m, actionUrl: `${m.actionUrl}&detailId=${orderId}` }
            }
            return m
          })
          
          state.messages = validMessages
          // 同步修正未读计数，解决“信息1乱跳”问题
          state.unreadCount = validMessages.filter(m => !m.isRead).length
        }
      }
    }
  )
)
