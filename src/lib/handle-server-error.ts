import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { getErrorStatus, isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'

const logger = createLogger('handleServerError')

export function isConflictError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  if ('isConflict' in error && Boolean(error.isConflict)) return true
  if ('status' in error && Number(error.status) === 409) return true
  return false
}

export function handleServerError(error: unknown) {
  const status = getErrorStatus(error)
  const errorMessage = error instanceof Error ? error.message : String(error)

  // 结构化后台日志上报（含 HTTP 状态码，便于远程日志平台按 status 聚合搜索）
  logger.error('Server error intercepted', {
    status,
    message: errorMessage,
    errorObject: error,
  })

  // --- UI 层分支处理 ---

  if (isForbiddenError(error)) {
    toast.error('无权限执行当前操作')
    return
  }

  if (isConflictError(error)) {
    toast.error('数据已被更新，请刷新后重试')
    return
  }

  // 熔断器触发的请求
  if (errorMessage.includes('[CIRCUIT_BREAKER]')) {
    toast.error('服务暂时不可用，请稍后重试')
    return
  }

  // 请求超时
  if (errorMessage.includes('[TIMEOUT]')) {
    toast.error('请求超时，请检查网络连接')
    return
  }

  if (status === 204) {
    toast.error('未找到相关内容')
    return
  }

  let errMsg = '操作失败，请重试'

  if (error instanceof AxiosError) {
    errMsg = error.response?.data.title || error.message
  } else if (error instanceof Error) {
    errMsg = error.message
  }

  toast.error(errMsg)
}

