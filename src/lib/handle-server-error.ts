import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { getErrorStatus, isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { ERROR_ACTION_REGISTRY } from '@/lib/error-action-registry'
import { router } from '@/lib/router'
import { translate, DEFAULT_LOCALE, type AppLocale, type TranslationKey } from '@/locales'
import { getCookie } from '@/lib/cookies'
import { LANGUAGE_COOKIE_NAME } from '@/lib/locale'

const logger = createLogger('handleServerError')

export interface ServerErrorDisplayAction {
  label: string
  onClick: () => void
}

export interface ServerErrorPresentation {
  message: string
  action?: ServerErrorDisplayAction
  duration?: number
  status?: number | undefined
}

const FORBIDDEN_SUBTITLE_KEY: TranslationKey = 'errors.forbidden.subtitle'
const INVALID_CREDENTIALS_KEY: TranslationKey = 'common.auth.signInForm.invalidCredentials'
const API_NOT_READY_KEY: TranslationKey = 'common.auth.signInForm.apiNotReady'
const TIMEOUT_KEY: TranslationKey = 'common.auth.signInForm.timeout'
const EMPTY_NO_DATA_KEY: TranslationKey = 'common.empty.noData'
const SERVER_ERROR_KEY: TranslationKey = 'common.auth.signInForm.serverError'

export function isConflictError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  if ('isConflict' in error && Boolean(error.isConflict)) return true
  if ('status' in error && Number(error.status) === 409) return true
  return false
}

export function getServerErrorPresentation(error: unknown): ServerErrorPresentation {
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
      const navigationTarget = actionMetadata.target
      return {
        message: msg,
        duration: 8000,
        status,
        action: {
          label: translate(locale, actionMetadata.actionLabelKey),
          onClick: () => {
            logger.info('Action triggered', { target: actionMetadata.target })
            router.navigate({ to: navigationTarget })
              .then(() => logger.info('Navigation successful'))
              .catch((err) => logger.error('Navigation failed', err))
          },
        },
      }
    }
    return { message: msg, status }
  }

  // --- 2. UI 层分支处理 (i18n 化) ---

  if (isForbiddenError(error)) {
    return { message: translate(locale, FORBIDDEN_SUBTITLE_KEY), status }
  }

  // 默认冲突逻辑 (如果没有被 Registry 命中)
  if (isConflictError(error)) {
    return { message: translate(locale, INVALID_CREDENTIALS_KEY), status }
  }

  // 熔断器 / 超时 / 异常状态
  if (errorMessage.includes('[CIRCUIT_BREAKER]')) {
    return { message: translate(locale, API_NOT_READY_KEY), status }
  }

  if (errorMessage.includes('[TIMEOUT]')) {
    return { message: translate(locale, TIMEOUT_KEY), status }
  }

  if (status === 204) {
    return { message: translate(locale, EMPTY_NO_DATA_KEY), status }
  }

  let errMsg = translate(locale, SERVER_ERROR_KEY, { status: status || '???' })

  if (error instanceof AxiosError) {
    errMsg = error.response?.data.title || error.message
  } else if (error instanceof Error) {
    errMsg = error.message
  }

  return { message: errMsg, status }
}

export function showServerErrorToast(presentation: ServerErrorPresentation) {
  if (presentation.action) {
    toast.error(presentation.message, {
      duration: presentation.duration,
      action: presentation.action,
    })
    return
  }

  toast.error(presentation.message)
}

export function handleServerError(error: unknown) {
  showServerErrorToast(getServerErrorPresentation(error))
}

