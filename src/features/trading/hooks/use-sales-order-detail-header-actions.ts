import { toast } from 'sonner'

interface UseSalesOrderDetailHeaderActionsParams {
  printLabel: string
  printPendingMessage: string
}

export function useSalesOrderDetailHeaderActions({
  printLabel,
  printPendingMessage,
}: UseSalesOrderDetailHeaderActionsParams) {
  const handlePrint = () => {
    toast.info(printPendingMessage)
  }

  return {
    handlePrint,
    printLabel,
  }
}
