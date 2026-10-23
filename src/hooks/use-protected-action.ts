import type { TranslationKey } from '@/locales'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { useLanguage } from '@/context/language-provider'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'

interface ConfirmedActionOptions {
  /** 权限标识符。如果传入，将自动调用非阻断动作许可辅助。 */
  permission?: string
  /** 确认消息的多语言 Key。如果传入，将等待应用内确认弹窗。 */
  confirmKey?: string
  /** 确认消息的变量（用于 t()）。 */
  confirmVars?: Record<string, string | number>
  /** 核心操作回调。 */
  onAction: () => void | Promise<void>
}

/**
 * useConfirmedActionFlow - 统一处理“非阻断动作许可 + 二次确认”的操作钩子
 */
export function useConfirmedActionFlow() {
  const { allowsAction } = usePermissionActions()
  const { t } = useLanguage()

  const runConfirmedAction = async (options: ConfirmedActionOptions) => {
    // 1. 非阻断动作许可判断
    if (options.permission && !allowsAction(options.permission)) {
      return
    }

    // 2. 二次确认拦截
    if (options.confirmKey) {
      const message = t(
        options.confirmKey as TranslationKey,
        options.confirmVars
      )
      if (!(await requestApplicationConfirmation(message))) {
        return
      }
    }

    // 3. 执行操作
    return options.onAction()
  }

  return { runConfirmedAction }
}
