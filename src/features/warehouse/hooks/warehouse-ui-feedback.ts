import { toast } from 'sonner'

export interface WarehouseUiFeedback {
  confirm(message: string): boolean
  error(message: string): void
  success(message: string): void
  warning(message: string): void
}

export function createWarehouseUiFeedback(): WarehouseUiFeedback {
  return {
    confirm: (message) => {
      if (typeof window === 'undefined') {
        return false
      }
      return window.confirm(message)
    },
    error: toast.error,
    success: toast.success,
    warning: toast.warning,
  }
}
