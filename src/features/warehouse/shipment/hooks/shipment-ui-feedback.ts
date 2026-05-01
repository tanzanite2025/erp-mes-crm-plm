import { toast } from 'sonner'
import { type AppLocale } from '@/locales'
import { resolveInventoryErrorTip } from '../../constants/inventory-error-codes'

export interface ShipmentUiFeedback {
  confirm(message: string): boolean
  error(message: string): void
  resolveError(error: unknown): string
  success(message: string): void
  warning(message: string): void
}

export function createShipmentUiFeedback(locale: AppLocale): ShipmentUiFeedback {
  return {
    confirm: (message) => {
      if (typeof window === 'undefined') {
        return false
      }
      return window.confirm(message)
    },
    error: toast.error,
    resolveError: (error) => resolveInventoryErrorTip(error, locale),
    success: toast.success,
    warning: toast.warning,
  }
}
