import { toast } from 'sonner'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'

export interface WarehouseUiFeedback {
  confirm(message: string): boolean | Promise<boolean>
  error(message: string): void
  success(message: string): void
  warning(message: string): void
}

export function createWarehouseUiFeedback(): WarehouseUiFeedback {
  return {
    confirm: async (message) => {
      if (typeof window === 'undefined') {
        return false
      }
      return await requestApplicationConfirmation(message)
    },
    error: toast.error,
    success: toast.success,
    warning: toast.warning,
  }
}
