import { createLazyFileRoute } from '@tanstack/react-router'
import StockMgmt from '@/features/warehouse/tabs/stock-mgmt'

export const Route = createLazyFileRoute('/_authenticated/warehouse/')({
  component: StockMgmt,
})
