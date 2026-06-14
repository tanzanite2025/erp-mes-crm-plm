/**
 * 系统消息类型体系
 */

export type NotificationType =
  | 'ORDER_EVENT' // 订单相关事件 (下达、审核、变更)
  | 'QUALITY_STANDARD_EVENT' // 品质标准受控流程事件
  | 'BOM_EVENT' // BOM (EBOM / MBOM) 生命周期事件
  | 'QUALITY_ALERT' // 质量预警
  | 'EQUIPMENT_STATUS' // 设备运行状态异常
  | 'SYSTEM_NOTICE' // 系统公告/维护
  | 'TASK_ASSIGNED' // 任务指派

export type NotificationPriority = 'info' | 'warning' | 'error' | 'critical'

export interface SystemMessage {
  id: string
  type: NotificationType
  title: string
  content: string
  priority: NotificationPriority
  timestamp: string
  isRead: boolean
  isDismissed?: boolean // 是否已在屏幕上被手动关闭 (临时隐藏)
  isArchived?: boolean // 是否被系统自动归档（订单状态已解除触发条件�?
  targetGroups?: string[] // message recipient groups
  targetUsers?: string[] // 特定用户接收
  actionUrl?: string // 点击跳转路径
  metadata?: Record<string, unknown> // 携带业务参数
  ruleId?: string // 来源规则 ID
  segmentId?: string // 来源分支 ID
  commandId?: string // 绑定指令 ID
}

export interface NotificationState {
  messages: SystemMessage[]
  unreadCount: number
  dismissedKeys: Record<string, number> // [uniqueKey]: timestamp

  addMessage: (
    message: Omit<SystemMessage, 'id' | 'timestamp' | 'isRead' | 'isDismissed'>
  ) => void
  markAsRead: (id: string) => void
  dismissMessage: (id: string) => void // 仅从屏幕点击关闭，不删除
  archiveMessage: (id: string) => void // 系统自动归档（订单已解决�?
  archiveByOrderId: (orderId: string) => void // 按订�?ID 批量归档
  syncWithCommands: (validCommandIds: string[]) => void // 彻底清理已删除指令的消息
  syncWithOrders: (validOrderIds: string[]) => void // 彻底清理已删除订单的消息
  syncWithRules: (validRuleIds: string[]) => void // 彻底清理已删除或停用规则的消�?
  pruneOldMessages: (days: number) => void // 滚动清理 N 天前的已�?归档消息
  clearAll: () => void
  removeMessage: (id: string) => void

  // --- 兼容性占�?(不再使用路由规则逻辑) ---
  rules: unknown[]
  updateRule: (type: NotificationType, updates: unknown) => void
  initializeRules: (groups: string[]) => void
  cleanupGroups: (validGroupIds: string[]) => void
}
