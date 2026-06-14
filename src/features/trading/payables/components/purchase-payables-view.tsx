import { useMemo } from 'react'
import { BanknoteArrowUp } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useGetPayables } from '../hooks/use-payables'
import { usePurchasePayablesPageState } from '../hooks/use-purchase-payables-page-state'
import { PurchasePayableDetailDialog } from './purchase-payable-detail-dialog'
import { PurchasePayablesSummaryCards } from './purchase-payables-summary-cards'
import { PurchasePayablesTableCard } from './purchase-payables-table-card'

interface PurchasePayablesViewProps {
  /** 来源类型筛选，如 'PURCHASE_ORDER' */
  sourceType?: string
  /** 来源单据 ID */
  sourceRefId?: string
  /** 是否自动打开第一条详情 */
  autoOpen?: boolean
  /** 是否显示页面级 Header（嵌入 TAB 时可隐藏） */
  showHeader?: boolean
}

/**
 * 应付管理视图组件 — 路由无关，可嵌入任何容器。
 * 与 SalesReceivablesView 完全对称。
 */
export function PurchasePayablesView({
  sourceType,
  sourceRefId,
  autoOpen,
  showHeader = true,
}: PurchasePayablesViewProps) {
  const { t } = useLanguage()
  const listQueryParams = useMemo(
    () => ({
      sourceType,
      sourceRefId,
    }),
    [sourceRefId, sourceType]
  )
  const { data } = useGetPayables(listQueryParams)

  const summary = data?.summary
  const items = useMemo(() => data?.items ?? [], [data?.items])
  const { activeLedgerId, handleSelectPayable, handleDetailOpenChange } =
    usePurchasePayablesPageState({
      sourceType,
      sourceRefId,
      autoOpen,
      items,
    })

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      {showHeader && (
        <IndustrialHeader
          icon={BanknoteArrowUp}
          title={t('purchase.payables.title')}
          description={t('purchase.payables.description')}
        />
      )}

      <PurchasePayablesSummaryCards summary={summary} />

      <PurchasePayablesTableCard
        items={items}
        onSelectPayable={handleSelectPayable}
      />

      <PurchasePayableDetailDialog
        open={Boolean(activeLedgerId)}
        ledgerId={activeLedgerId}
        onOpenChange={handleDetailOpenChange}
      />
    </div>
  )
}
