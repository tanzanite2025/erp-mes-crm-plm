import { useMemo } from 'react'
import { BanknoteArrowDown } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { SalesReceivablesSummaryCards } from './sales-receivables-summary-cards'
import { SalesReceivablesTableCard } from './sales-receivables-table-card'
import { SalesReceivableDetailDialog } from './sales-receivable-detail-dialog'
import { useSalesReceivablesPageState } from '../hooks/use-sales-receivables-page-state'
import { useGetReceivables } from '../hooks/use-receivables'

interface SalesReceivablesViewProps {
  /** 来源类型筛选，如 'SALES_ORDER' */
  sourceType?: string
  /** 来源单据 ID */
  sourceRefId?: string
  /** 是否自动打开第一条详情 */
  autoOpen?: boolean
  /** 是否显示页面级 Header（嵌入 TAB 时可隐藏） */
  showHeader?: boolean
}

/**
 * 应收管理视图组件 — 路由无关，可嵌入任何容器。
 */
export function SalesReceivablesView({
  sourceType,
  sourceRefId,
  autoOpen,
  showHeader = true,
}: SalesReceivablesViewProps) {
  const { t } = useLanguage()
  const listQueryParams = useMemo(
    () => ({
      sourceType,
      sourceRefId,
    }),
    [sourceRefId, sourceType]
  )
  const { data } = useGetReceivables(listQueryParams)

  const summary = data?.summary
  const items = useMemo(() => data?.items ?? [], [data?.items])
  const { activeReceivableId, handleSelectReceivable, handleDetailOpenChange } =
    useSalesReceivablesPageState({
      sourceType,
      sourceRefId,
      autoOpen,
      items,
    })

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      {showHeader && (
        <IndustrialHeader
          icon={BanknoteArrowDown}
          title={t('trading.receivables.title')}
          description={t('trading.receivables.description')}
        />
      )}

      <SalesReceivablesSummaryCards
        summary={summary}
        totalLabel={t('trading.receivables.summaryTotal')}
        overdueLabel={t('trading.receivables.summaryOverdue')}
        pendingLabel={t('trading.receivables.summaryPending')}
      />

      <SalesReceivablesTableCard
        title={t('trading.receivables.tableTitle')}
        description={t('trading.receivables.tableDescription')}
        items={items}
        columnLabels={{
          documentNo: t('trading.receivables.columns.documentNo'),
          customerName: t('trading.receivables.columns.customerName'),
          orderAmount: t('trading.receivables.columns.orderAmount'),
          receivedAmount: t('trading.receivables.columns.receivedAmount'),
          outstandingAmount: t('trading.receivables.columns.outstandingAmount'),
          dueDate: t('trading.receivables.columns.dueDate'),
          agingBucket: t('trading.receivables.columns.agingBucket'),
          status: t('trading.receivables.columns.status'),
        }}
        onSelectReceivable={handleSelectReceivable}
      />

      <SalesReceivableDetailDialog
        open={Boolean(activeReceivableId)}
        receivableId={activeReceivableId}
        onOpenChange={handleDetailOpenChange}
      />
    </div>
  )
}
