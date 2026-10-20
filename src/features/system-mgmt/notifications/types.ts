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
