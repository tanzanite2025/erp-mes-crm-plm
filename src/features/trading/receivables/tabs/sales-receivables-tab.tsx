import { Route } from '@/routes/_authenticated/trading/receivables'
import { SalesReceivablesView } from '../components/sales-receivables-view'

/**
 * 销售管理 → 应收 TAB 页壳。
 * 仅负责从路由读取 search params，转发给路由无关的 SalesReceivablesView。
 */
export function SalesReceivablesTab() {
  const search = Route.useSearch()

  return (
    <SalesReceivablesView
      sourceType={search.sourceType}
      sourceRefId={search.sourceRefId}
      autoOpen={search.autoOpen}
    />
  )
}
