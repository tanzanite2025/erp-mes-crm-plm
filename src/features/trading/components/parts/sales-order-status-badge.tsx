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
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${meta.color}`}
    >
      {getSalesStatusLabel(status, t)}
    </span>
  )
}
