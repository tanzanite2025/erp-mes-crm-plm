import { isValidRoute } from './ai-protocol-validator'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AiActionBus')

/**
 * AI 动作总线 (AI Action Bus)
 * 职责：作为极光助手所有输出动作（ACT/CMD）的唯一分发中心。
 * 安全：在执行前进行 100% 的路由合法性与权限校验。
 */
export interface ActionPayload {
  type: 'ACT' | 'CMD'
  label: string
  value: string
}

export const aiActionBus = {
  /**
   * 执行动作
   * @param payload 动作载荷
   * @param navigate 导航函数 (由 UI 层注入)
   * @param onCommand 指令回调 (由 UI 层注入)
   */
  dispatch(
    payload: ActionPayload, 
    navigate: (route: string) => void,
    onCommand: (cmd: string) => void
  ): void {
    const { type, label, value } = payload

    // 1. 安全验证
    if (type === 'ACT') {
      if (!isValidRoute(value)) {
        logger.error(`Blocked invalid route: ${value}`)
        toast.error(`[安全拦截] 极光助手生成的路径无效或超出权限范围: ${value}`)
        return
      }
      
      logger.info(`Navigating to: ${value} (${label})`)
      navigate(value)
    } else if (type === 'CMD') {
      logger.info(`Executing command: ${value}`)
      onCommand(value)
    }
  }
}
