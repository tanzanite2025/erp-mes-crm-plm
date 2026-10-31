import { useLanguage } from '@/context/language-provider'
import {
  getSalesStatusLabel,
  getSalesStatusMeta,
} from '../../data/sales-status'
import { type SalesOrderStatus } from '../../data/schema'

export function SalesOrderStatusBadge({
  status,
}: {
  status: SalesOrderStatus | string
}) {
  const { t } = useLanguage()
  const meta = getSalesStatusMeta(status)

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs leading-5 font-medium ${meta.color}`}
    >
      {getSalesStatusLabel(status, t)}
    </span>
  )
}
