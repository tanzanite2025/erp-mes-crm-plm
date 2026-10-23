import { type AppLocale } from '@/locales'
import { toast } from 'sonner'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { resolveInventoryErrorTip } from '../../constants/inventory-error-codes'

export interface ShipmentUiFeedback {
  confirm(message: string): boolean | Promise<boolean>
  error(message: string): void
  resolveError(error: unknown): string
  success(message: string): void
  warning(message: string): void
}

export function createShipmentUiFeedback(
  locale: AppLocale
): ShipmentUiFeedback {
  return {
    confirm: async (message) => {
      if (typeof window === 'undefined') {
        return false
      }
      return await requestApplicationConfirmation(message)
    },
    error: toast.error,
    resolveError: (error) => resolveInventoryErrorTip(error, locale),
    success: toast.success,
    warning: toast.warning,
  }
}
