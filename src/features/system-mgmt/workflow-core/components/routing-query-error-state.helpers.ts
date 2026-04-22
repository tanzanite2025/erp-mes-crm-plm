import { ZodError } from 'zod'
import {
  isAuthRequiredError,
  isCircuitBreakerError,
  isInvalidResponseError,
  isNetworkError,
  isTimeoutError,
} from '@/lib/error-status'

export type RoutingQueryErrorTone =
  | 'protocol'
  | 'auth'
  | 'network'
  | 'timeout'
  | 'circuit'
  | 'generic'

export interface RoutingQueryErrorState {
  tone: RoutingQueryErrorTone
  title: string
  description: string
  hint: string
  detail: string | null
}

export type RoutingQueryErrorOptions = {
  resourceLabel: string
  endpoint: string
  protocolShape?: string
}

function extractErrorMessage(error: unknown): string | null {
  if (error instanceof ZodError) {
    const joinedIssues = error.issues
      .map((issue) => issue.message.trim())
      .filter(Boolean)
      .join('；')
    return joinedIssues.length > 0 ? joinedIssues : error.message.trim() || null
  }

  if (error instanceof Error) {
    const normalized = error.message.trim()
    return normalized.length > 0 ? normalized : null
  }

  if (!error || typeof error !== 'object') {
    return null
  }

  const record = error as Record<string, unknown>
  const message = typeof record.message === 'string' ? record.message.trim() : ''
  return message.length > 0 ? message : null
}

function isProtocolShapeError(error: unknown, detail: string | null): boolean {
  if (error instanceof ZodError || isInvalidResponseError(error)) {
    return true
  }

  if (!detail) {
    return false
  }

  const normalized = detail.toLowerCase()
  return [
    'invalid response',
    'invalid_response',
    'expected object',
    'expected array',
    'invalid input',
    'page',
    'pagesize',
    'total',
    'items',
  ].some((keyword) => normalized.includes(keyword))
}

export function getRoutingQueryErrorState(
  error: unknown,
  options: RoutingQueryErrorOptions
): RoutingQueryErrorState {
  const detail = extractErrorMessage(error)
  const { endpoint, protocolShape, resourceLabel } = options
  const expectedShape = protocolShape ?? '当前页面约定的数据结构'

  if (isProtocolShapeError(error, detail)) {
    return {
      tone: 'protocol',
      title: `${resourceLabel}数据格式异常`,
      description: `${resourceLabel}接口返回的数据结构和当前页面约定不一致，页面已停止渲染这批数据，避免把错误内容误当成真实配置。`,
      hint: `请检查 \`${endpoint}\` 是否稳定返回 ${expectedShape}。`,
      detail,
    }
  }

  if (isAuthRequiredError(error)) {
    return {
      tone: 'auth',
      title: `${resourceLabel}暂无访问权限`,
      description: `当前账号还不能读取${resourceLabel}，页面没有继续加载这批数据。`,
      hint: '请确认登录状态、接口权限和当前账号是否具备查看权限。',
      detail,
    }
  }

  if (isCircuitBreakerError(error)) {
    return {
      tone: 'circuit',
      title: `${resourceLabel}服务暂时熔断`,
      description: '系统为了保护后端服务，暂时停止了这次读取请求。',
      hint: `先检查后端服务健康状态，再重新加载${resourceLabel}。`,
      detail,
    }
  }

  if (isTimeoutError(error)) {
    return {
      tone: 'timeout',
      title: `${resourceLabel}读取超时`,
      description: `${resourceLabel}接口响应时间过长，本次请求已被中断。`,
      hint: '请确认后端处理是否过慢，或稍后重试。',
      detail,
    }
  }

  if (isNetworkError(error)) {
    return {
      tone: 'network',
      title: `${resourceLabel}暂时无法连接`,
      description: `前端暂时没有连到${resourceLabel}接口，这次读取没有拿到有效结果。`,
      hint: '请检查当前网络、网关或后端服务状态，然后重新加载。',
      detail,
    }
  }

  return {
    tone: 'generic',
    title: `${resourceLabel}读取失败`,
    description: `本次${resourceLabel}读取没有成功完成，但错误类型暂时无法自动归类。`,
    hint: '可以先重新加载；如果持续出现，再检查接口响应和前端控制台错误。',
    detail,
  }
}
