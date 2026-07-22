/**
 * AI 协议验证器 (AI Protocol Validator)
 * 职责：防止 AI 幻觉生成的非法路由或高危指令。
 */
import { createLogger } from '@/lib/logger'
import { findRoutePermissionEntry } from '@/features/authz/data/route-permission-queries'

const logger = createLogger('AiProtocolValidator')

const MAX_AI_COMMAND_CHARS = 500
const COMMAND_FORBIDDEN_TOKENS = ['[act:', '[cmd:', '<script', 'javascript:']

function normalizeActionRoutePath(route: string): string | null {
  const trimmedRoute = route.trim()
  if (!trimmedRoute) return null

  if (/^[a-z][a-z\d+.-]*:/i.test(trimmedRoute)) {
    return null
  }

  const basePath = trimmedRoute.split(/[?#]/)[0]?.trim()
  if (!basePath?.startsWith('/')) {
    return null
  }

  const normalizedPath = basePath.replace(/\/+/g, '/').replace(/\/$/g, '')
  return normalizedPath || '/'
}

/**
 * 验证跳转路由是否合法
 */
export function isValidRoute(route: string): boolean {
  const basePath = normalizeActionRoutePath(route)
  if (!basePath) return false

  return Boolean(findRoutePermissionEntry(basePath))
}

/**
 * 验证 AI CMD 是否仍是“分析指令”，而不是嵌套动作或脚本载荷。
 */
export function isValidCommand(command: string): boolean {
  const normalizedCommand = command.trim()
  if (!normalizedCommand) return false
  if (normalizedCommand.length > MAX_AI_COMMAND_CHARS) return false

  const lowerCommand = normalizedCommand.toLowerCase()
  return !COMMAND_FORBIDDEN_TOKENS.some((token) => lowerCommand.includes(token))
}

/**
 * 修正/过滤 Action 列表
 */
export interface ActionItem {
  label: string
  value: string
  type: 'ACT' | 'CMD'
}

export function validateActions(actions: ActionItem[]): ActionItem[] {
  return actions.filter((action) => {
    if (action.type === 'CMD') {
      const isValid = isValidCommand(action.value)
      if (!isValid) {
        logger.warn(`Blocked suspicious command payload: ${action.label}`)
      }
      return isValid
    }

    const isValid = isValidRoute(action.value)
    if (!isValid) {
      logger.warn(
        `Blocked suspicious/invalid route hallucination: ${action.value}`
      )
    }
    return isValid
  })
}
