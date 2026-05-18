interface UseSalesOrderDetailHeaderActionsParams {
  printLabel: string
  onPrint: () => void
}

export function useSalesOrderDetailHeaderActions({
  printLabel,
  onPrint,
}: UseSalesOrderDetailHeaderActionsParams) {
  const handlePrint = () => {
    onPrint()
  }

  return {
    handlePrint,
    printLabel,
  }
}
