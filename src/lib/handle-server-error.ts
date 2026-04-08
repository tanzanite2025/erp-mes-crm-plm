import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { getErrorStatus, isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { ERROR_ACTION_REGISTRY } from '@/lib/error-action-registry'
import { router } from '@/lib/router'
import { translate, AppLocale, DEFAULT_LOCALE } from '@/locales'
import { getCookie } from '@/lib/cookies'
import { LANGUAGE_COOKIE_NAME } from '@/lib/locale'

const logger = createLogger('handleServerError')

export function isConflictError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  if ('isConflict' in error && Boolean(error.isConflict)) return true
  if ('status' in error && Number(error.status) === 409) return true
  return false
}

export function handleServerError(error: unknown) {
  const status = getErrorStatus(error)
  let errorMessage = error instanceof Error ? error.message : String(error)
  
  // If it's an AxiosError, prioritize the inner error message if available
  if (error instanceof AxiosError && error.response?.data?.error) {
    errorMessage = error.response.data.error
  }

  const locale = (getCookie(LANGUAGE_COOKIE_NAME) as AppLocale) || DEFAULT_LOCALE

  // 结构化后台日志上报
  logger.error('Server error intercepted', {
    status,
    message: errorMessage,
    errorObject: error,
  })

  // --- 1. 尝试从全局错误动作注册表中匹配 ---
  const actionMetadata = ERROR_ACTION_REGISTRY[errorMessage]
  if (actionMetadata) {
    const msg = translate(locale, actionMetadata.messageKey)
    if (actionMetadata.actionLabelKey && actionMetadata.target) {
      toast.error(msg, {
        duration: 8000, // 稍微延长显示时间
        action: {
          label: translate(locale, actionMetadata.actionLabelKey),
          onClick: () => {
            logger.info('Action triggered', { target: actionMetadata.target })
            // 尝试直接使用 navigate
            router.navigate({ to: actionMetadata.target as any })
              .then(() => logger.info('Navigation successful'))
              .catch((err) => logger.error('Navigation failed', err))
          }
        }
      })
    } else {
      toast.error(msg)
    }
    return
  }

  // --- 2. UI 层分支处理 (i18n 化) ---

  if (isForbiddenError(error)) {
    toast.error(translate(locale, 'errors.forbidden.subtitle' as any))
    return
  }

  // 默认冲突逻辑 (如果没有被 Registry 命中)
  if (isConflictError(error)) {
    toast.error(translate(locale, 'common.auth.signInForm.invalidCredentials' as any)) // or another generic
    // Note: The previous hardcoded '数据已被更新' is better suited for a generic conflict key
    return
  }

  // 熔断器 / 超时 / 异常状态
  if (errorMessage.includes('[CIRCUIT_BREAKER]')) {
    toast.error(translate(locale, 'common.auth.signInForm.apiNotReady' as any))
    return
  }

  if (errorMessage.includes('[TIMEOUT]')) {
    toast.error(translate(locale, 'common.auth.signInForm.timeout' as any))
    return
  }

  if (status === 204) {
    toast.error(translate(locale, 'common.empty.noData' as any))
    return
  }

  let errMsg = translate(locale, 'common.auth.signInForm.serverError' as any, { status: status || '???' })

  if (error instanceof AxiosError) {
    errMsg = error.response?.data.title || error.message
  } else if (error instanceof Error) {
    errMsg = error.message
  }

  toast.error(errMsg)
}

